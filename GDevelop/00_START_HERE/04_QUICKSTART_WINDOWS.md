# Inicio rápido Windows

Requisitos: GDevelop Desktop; Git; PowerShell; Node/npm para MCP.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\08_SCRIPTS\00_CHECK_ENV.ps1
.\08_SCRIPTS\01_FETCH_ALL_REFERENCES.ps1
.\08_SCRIPTS\06_VERIFY_KIT.ps1
```

Proyecto:

```powershell
.\08_SCRIPTS\07_NEW_PROJECT.ps1 -Destination "C:\PROYECTOS\MiJuego" -InitGit
```

MCP:

```powershell
.\08_SCRIPTS\02_INSTALL_MCP_DEPENDENCIES.ps1 -IUnderstand
.\08_SCRIPTS\03_GENERATE_MCP_CONFIG.ps1
```

El generador de MCP crea snippets; no altera silenciosamente la configuración global.
