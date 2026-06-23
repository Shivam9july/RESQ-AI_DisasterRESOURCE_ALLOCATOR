import React from "react";
import { Icon, IconName } from "./Icon";
import { titleCase } from "../lib/types";

export const TypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span className={`badge badge-${type}`}>
    <Icon name={(type as IconName) ?? "alert"} size={13} />
    {titleCase(type)}
  </span>
);

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => (
  <span className={`sev sev-${severity}`}>{titleCase(severity)}</span>
);
