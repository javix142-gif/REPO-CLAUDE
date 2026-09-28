# LEEME PRIMERO

El kit implementa un flujo **Planner → Coder → Preview → Auditor → Gate** para GDevelop.

## Primer arranque en Windows

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\08_SCRIPTS\00_CHECK_ENV.ps1
.\08_SCRIPTS\01_FETCH_ALL_REFERENCES.ps1
.\08_SCRIPTS\06_VERIFY_KIT.ps1
```

## MCP

El MCP es externo y no oficial. Antes de instalar dependencias:

```powershell
Get-Content .\03_MCP\SECURITY_REVIEW.md
.\08_SCRIPTS\02_INSTALL_MCP_DEPENDENCIES.ps1 -IUnderstand
.\08_SCRIPTS\03_GENERATE_MCP_CONFIG.ps1
```

## Regla de contexto

No pasar el kit completo a un modelo. Cargar solo:

- `AGENTS.md`;
- `PROJECT_STATE.md`;
- `TASK_SPEC.md`;
- contrato visual/assets si aplica;
- fuentes concretas recuperadas por búsqueda.

El resto se consulta bajo demanda.
