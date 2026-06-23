"""Seed the database with a demo operator and realistic sample incidents."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from detection_api.models import Incident
from detection_api.relief_calculator import calculate_relief_amount

User = get_user_model()

DEFAULT_EMAIL = "commander@resq.local"
DEFAULT_PASSWORD = "resq1234"

# (type, severity, confidence, lat, lon, area_km2, hours_ago)
SAMPLE_INCIDENTS = [
    ("fire", "critical", 0.94, 34.0522, -118.2437, 1.85, 3),
    ("flood", "high", 0.81, 25.7617, -80.1918, 4.2, 9),
    ("crowd", "medium", 0.63, 40.7128, -74.0060, 0.12, 14),
    ("fire", "high", 0.78, -33.8688, 151.2093, 0.9, 22),
    ("flood", "critical", 0.91, 22.3193, 114.1694, 6.5, 30),
    ("crowd", "high", 0.74, 51.5074, -0.1278, 0.21, 41),
    ("fire", "low", 0.42, 19.4326, -99.1332, 0.25, 52),
    ("flood", "medium", 0.66, 1.3521, 103.8198, 2.1, 64),
    ("crowd", "critical", 0.89, 35.6895, 139.6917, 0.34, 76),
    ("fire", "medium", 0.58, 55.7558, 37.6173, 0.6, 88),
    ("flood", "low", 0.38, -23.5505, -46.6333, 0.8, 100),
    ("crowd", "medium", 0.61, 28.6139, 77.2090, 0.18, 120),
    ("fire", "critical", 0.95, 37.7749, -122.4194, 2.3, 140),
    ("flood", "high", 0.83, 48.8566, 2.3522, 3.4, 160),
    ("crowd", "low", 0.45, -34.6037, -58.3816, 0.09, 180),
    ("fire", "high", 0.77, 31.2304, 121.4737, 1.1, 200),
    ("flood", "medium", 0.64, 13.7563, 100.5018, 2.8, 230),
    ("crowd", "high", 0.76, 39.9042, 116.4074, 0.27, 260),
    ("fire", "low", 0.41, 41.0082, 28.9784, 0.3, 290),
    ("flood", "critical", 0.92, -1.2921, 36.8219, 5.2, 320),
]

SEVERITY_DENSITY = {"fire": 620, "flood": 360, "crowd": 1350}


class Command(BaseCommand):
    help = "Seed a demo operator and realistic sample incidents for the dashboard."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing incidents before seeding.",
        )

    def handle(self, *args, **options):
        reset = options.get("reset", False)

        # 1. Ensure a demo operator exists.
        user, created = User.objects.get_or_create(
            email=DEFAULT_EMAIL,
            defaults={
                "username": "commander",
                "first_name": "Shivam",
                "last_name": "Commander",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created or not user.has_usable_password():
            user.set_password(DEFAULT_PASSWORD)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Operator ready: {DEFAULT_EMAIL} / {DEFAULT_PASSWORD}"
                )
            )
        else:
            self.stdout.write(f"Operator already exists: {DEFAULT_EMAIL}")

        # 2. Optionally clear incidents.
        if reset:
            deleted, _ = Incident.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing incidents."))

        existing = Incident.objects.count()
        if existing > 0 and not reset:
            self.stdout.write(
                self.style.WARNING(
                    f"{existing} incidents already present. Use --reset to reseed."
                )
            )
            return

        # 3. Create incidents across a spread of dates.
        now = timezone.now()
        created_count = 0
        for incident_type, severity, confidence, lat, lon, area, hours_ago in SAMPLE_INCIDENTS:
            population = max(1, round(area * SEVERITY_DENSITY[incident_type] * (0.75 + confidence * 0.5)))
            relief = calculate_relief_amount(incident_type, severity, area, population)
            Incident.objects.create(
                incident_type=incident_type,
                confidence=confidence,
                severity=severity,
                latitude=lat,
                longitude=lon,
                detected_at=now - timedelta(hours=hours_ago),
                estimated_affected_area=area,
                estimated_affected_population=population,
                relief_amount=relief,
                meta={"prediction_engine": "seed_dataset_v1", "source": "sample"},
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created_count} sample incidents.")
        )