{{/*
Expand the name of the chart.
*/}}
{{- define "woocommerce-mcp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "woocommerce-mcp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "woocommerce-mcp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources
*/}}
{{- define "woocommerce-mcp.labels" -}}
helm.sh/chart: {{ include "woocommerce-mcp.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: woocommerce-mcp-system
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{/*
Component Fullnames
*/}}
{{- define "woocommerce-mcp.database.fullname" -}}
{{- printf "%s-mariadb" (include "woocommerce-mcp.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "woocommerce-mcp.wordpress.fullname" -}}
{{- printf "%s-wordpress" (include "woocommerce-mcp.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "woocommerce-mcp.mcpServer.fullname" -}}
{{- printf "%s-mcp-server" (include "woocommerce-mcp.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "woocommerce-mcp.gateway.fullname" -}}
{{- printf "%s-gateway" (include "woocommerce-mcp.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "woocommerce-mcp.dashboard.fullname" -}}
{{- printf "%s-dashboard" (include "woocommerce-mcp.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Internal In-Cluster Kubernetes DNS Service Names (Requirement 10)
Uses standard in-cluster DNS: <service-name>.<namespace>.svc.cluster.local
*/}}
{{- define "woocommerce-mcp.database.serviceName" -}}
{{- printf "%s-mariadb" (include "woocommerce-mcp.fullname" .) }}
{{- end }}

{{- define "woocommerce-mcp.wordpress.serviceName" -}}
{{- printf "%s-wordpress" (include "woocommerce-mcp.fullname" .) }}
{{- end }}

{{- define "woocommerce-mcp.mcpServer.serviceName" -}}
{{- printf "%s-mcp-server" (include "woocommerce-mcp.fullname" .) }}
{{- end }}

{{- define "woocommerce-mcp.gateway.serviceName" -}}
{{- printf "%s-gateway" (include "woocommerce-mcp.fullname" .) }}
{{- end }}

{{/*
In-Cluster DNS FQDN URLs
*/}}
{{- define "woocommerce-mcp.wordpress.inClusterUrl" -}}
{{- printf "http://%s.%s.svc.cluster.local:%d" (include "woocommerce-mcp.wordpress.serviceName" .) .Release.Namespace (int .Values.wordpress.service.port) }}
{{- end }}

{{- define "woocommerce-mcp.mcpServer.inClusterUrl" -}}
{{- printf "http://%s.%s.svc.cluster.local:%d" (include "woocommerce-mcp.mcpServer.serviceName" .) .Release.Namespace (int .Values.woocommerceMcp.service.port) }}
{{- end }}

{{/*
Secret Names
*/}}
{{- define "woocommerce-mcp.database.secretName" -}}
{{- if .Values.database.existingSecret -}}
{{- .Values.database.existingSecret -}}
{{- else -}}
{{- printf "%s-db-secret" (include "woocommerce-mcp.fullname" .) -}}
{{- end -}}
{{- end }}

{{- define "woocommerce-mcp.credentials.secretName" -}}
{{- if .Values.secrets.existingSecret -}}
{{- .Values.secrets.existingSecret -}}
{{- else -}}
{{- printf "%s-credentials" (include "woocommerce-mcp.fullname" .) -}}
{{- end -}}
{{- end }}
