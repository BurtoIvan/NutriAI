# TRIAD MULTI-AGENT PROTOCOL

Este proyecto utiliza una orquestacion colaborativa entre tres modelos de IA:

## 1. Roles del Equipo
- **Antigravity (Gemini)**: Director de Orquesta y Ejecutor. Controla el espacio de trabajo, planifica etapas, crea archivos, ejecuta la aplicacion y realiza debugging en tiempo real.
- **Claude Code (Anthropic)**: Arquitecto Senior y Auditor. Se consulta para diseno de sistemas, refactorizaciones complejas, analisis de seguridad y modularidad.
- **OpenAI Codex (OpenAI)**: Especialista en QA y Lógica. Se consulta para deteccion de edge cases, analisis de errores y generacion de suites de pruebas unitarias.

## 2. Reglas de Operacion
- Cada cambio arquitectonico relevante debe ser auditado con `triad review <archivo>`.
- Las pruebas y validaciones deben incorporar casos borde propuestos por Codex con `triad test <archivo>`.
- Antigravity integra y sintetiza los aportes de las 3 IAs antes de finalizar cada tarea.
