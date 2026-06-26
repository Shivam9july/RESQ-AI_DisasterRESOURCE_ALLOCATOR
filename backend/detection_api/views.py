from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .authentication import CsrfExemptSessionAuthentication
from .models import Incident
from .serializers import (
    LoginSerializer,
    IncidentSerializer, 
    VideoDetectionRequestSerializer,
    FileUploadDetectionSerializer
)
from .relief_calculator import (
    calculate_relief_amount,
)
from .prediction import predict_from_media, predict_from_video_path


def serialize_operator(user):
    display_name = user.get_full_name() or user.username or user.email
    role = "Administrator" if user.is_staff else "Operator"
    return {
        "id": user.id,
        "name": display_name,
        "email": user.email,
        "role": role,
        "is_staff": user.is_staff,
    }


def health_check(request):
    """Unauthenticated liveness probe used by Render/uptime monitors."""
    return JsonResponse({"status": "ok", "service": "resq-api"})


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]
        User = get_user_model()

        try:
            username = User.objects.get(email__iexact=email).get_username()
        except User.DoesNotExist:
            username = email

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        return Response({"operator": serialize_operator(user)})


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentOperatorView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"operator": serialize_operator(request.user)})


@method_decorator(csrf_exempt, name="dispatch")
class BaseDetectionView(APIView):
    """
    Base class for fire/flood/social-distance detection endpoints.

    In a real deployment this would call into the corresponding detector
    module in the top-level `detectors/` package.
    """

    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    incident_type: str = ""

    def post(self, request, *args, **kwargs):
        serializer = VideoDetectionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        video_path = data["video_path"]
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        prediction = predict_from_video_path(video_path, self.incident_type)
        relief_amount = calculate_relief_amount(
            prediction.incident_type,
            prediction.severity,
            prediction.affected_area,
            prediction.affected_population,
        )

        incident = Incident.objects.create(
            incident_type=prediction.incident_type,
            confidence=prediction.confidence,
            severity=prediction.severity,
            latitude=latitude,
            longitude=longitude,
            estimated_affected_area=prediction.affected_area,
            estimated_affected_population=prediction.affected_population,
            relief_amount=relief_amount,
            meta={**prediction.meta, "video_path": video_path},
        )

        serializer = IncidentSerializer(incident, context={'request': request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class FireDetectionView(BaseDetectionView):
    incident_type = "fire"


class FloodDetectionView(BaseDetectionView):
    incident_type = "flood"


class SocialDistanceDetectionView(BaseDetectionView):
    incident_type = "crowd"


@method_decorator(csrf_exempt, name="dispatch")
class FileUploadDetectionView(APIView):
    """
    Handle file uploads (images/videos) and detect disasters.
    Automatically calculates relief amounts based on detection results.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = FileUploadDetectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        image_file = data.get("image")
        video_file = data.get("video")
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        incident_type = data.get("incident_type")

        uploaded_file = image_file or video_file
        prediction = predict_from_media(
            filename=uploaded_file.name,
            size_bytes=uploaded_file.size,
            content_type=getattr(uploaded_file, "content_type", None),
            requested_type=incident_type,
        )
        relief_amount = calculate_relief_amount(
            prediction.incident_type,
            prediction.severity,
            prediction.affected_area,
            prediction.affected_population,
        )

        incident = Incident.objects.create(
            incident_type=prediction.incident_type,
            confidence=prediction.confidence,
            severity=prediction.severity,
            latitude=latitude,
            longitude=longitude,
            image_file=image_file,
            video_file=video_file,
            estimated_affected_area=prediction.affected_area,
            estimated_affected_population=prediction.affected_population,
            relief_amount=relief_amount,
            meta={
                **prediction.meta,
                "uploaded_file": uploaded_file.name,
                "file_size_mb": round(uploaded_file.size / (1024 * 1024), 2),
            },
        )

        serializer = IncidentSerializer(incident, context={'request': request})
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class IncidentListView(generics.ListAPIView):
    serializer_class = IncidentSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Incident.objects.all()

        incident_type = self.request.query_params.get("type")
        if incident_type:
            queryset = queryset.filter(incident_type=incident_type)

        severity = self.request.query_params.get("severity")
        if severity:
            queryset = queryset.filter(severity=severity)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(incident_type__icontains=search) | Q(severity__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        """Return incidents plus summary KPIs in one response."""
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "count": self.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "results": serializer.data,
                    "summary": self._summary(queryset),
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": queryset.count(),
                "results": serializer.data,
                "summary": self._summary(queryset),
            }
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @staticmethod
    def _summary(qs):
        relief = qs.aggregate(total=Sum("relief_amount"))["total"] or 0
        population = qs.aggregate(total=Sum("estimated_affected_population"))["total"] or 0
        area = qs.aggregate(total=Sum("estimated_affected_area"))["total"] or 0
        return {
            "count": qs.count(),
            "total_relief": str(relief),
            "total_population": population,
            "total_area": float(area),
            "critical": qs.filter(severity="critical").count(),
            "high": qs.filter(severity="high").count(),
        }


class IncidentDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a single incident."""
    serializer_class = IncidentSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Incident.objects.all()
    lookup_field = "pk"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class IncidentStatsView(APIView):
    """Aggregate analytics for the dashboard."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        qs = Incident.objects.all()

        # Time window for the trend (default: last 30 days).
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))
        since = timezone.now() - timedelta(days=days)

        total_relief = qs.aggregate(t=Sum("relief_amount"))["t"] or 0
        total_population = qs.aggregate(t=Sum("estimated_affected_population"))["t"] or 0
        total_area = qs.aggregate(t=Sum("estimated_affected_area"))["t"] or 0

        by_type = list(
            qs.values("incident_type")
            .annotate(count=Count("id"), relief=Sum("relief_amount"))
            .order_by("-count")
        )
        by_severity = list(
            qs.values("severity")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        trend = list(
            qs.filter(detected_at__gte=since)
            .annotate(day=TruncDate("detected_at"))
            .values("day")
            .annotate(count=Count("id"), relief=Sum("relief_amount"))
            .order_by("day")
        )

        return Response(
            {
                "totals": {
                    "incidents": qs.count(),
                    "relief": str(total_relief),
                    "population": total_population,
                    "area": float(total_area),
                    "critical": qs.filter(severity="critical").count(),
                    "high": qs.filter(severity="high").count(),
                    "last_24h": qs.filter(
                        detected_at__gte=timezone.now() - timedelta(hours=24)
                    ).count(),
                },
                "by_type": by_type,
                "by_severity": by_severity,
                "trend": [
                    {
                        "day": entry["day"].isoformat() if entry["day"] else None,
                        "count": entry["count"],
                        "relief": str(entry["relief"] or 0),
                    }
                    for entry in trend
                ],
            }
        )
