# Arquitectura maestra

```text
Usuario / Planner
      |
      v
GAME_SPEC + TASK_SPEC + AGENTS
      |
      v
Agente de código
  |        |
  |        +--> gdevelop-reference
  |        +--> documentación oficial
  |        +--> ejemplos oficiales
  |        +--> extensiones oficiales
  |
  v
GDevelop MCP (opcional, no oficial)
      |
      +--> libGD / GDJS oficiales
      v
Proyecto GDevelop
      |
      +--> preview
      +--> gameplay tests
      +--> screenshots
      v
Auditor funcional + visual
      v
Acceptance gates
      v
Commit / release
```

| Capa | Responsabilidad |
|---|---|
| `01_AI_CONTROL` | reglas, especificación y continuidad |
| `02_SKILLS` | conocimiento reusable bajo demanda |
| `03_MCP` | acciones controladas sobre proyecto/preview |
| `04_OFFICIAL_REFERENCES` | verdad técnica primaria |
| `05_COMMUNITY` | referencias secundarias |
| `06_PROJECT_TEMPLATES` | punto de partida |
| `07_TESTING_GATES` | definición objetiva de terminado |
| `08_SCRIPTS` | bootstrap/actualización/búsqueda |
| `09_RESEARCH` | antecedentes |
| `10_LICENSES` | política de uso |
| `11_OPTIONAL` | recursos fuera del flujo base |
