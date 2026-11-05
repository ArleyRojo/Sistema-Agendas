# 📅 Agenda de Tareas y Compromisos
> Implementación de referencia basada en **SDD (Especificación de Dominio)**, **BDD (Escenarios de Comportamiento)** y **TDD (Plan de Pruebas Unitarias)** con TypeScript y Vitest.

---

## 🚀 Resumen del Proyecto

Sistema de gestión operativa que garantiza la integridad estricta del dominio mediante servicios desacoplados de infraestructura y un ciclo estricto **Red → Green → Refactor**.

### 🛡️ Reglas de Negocio Implementadas (RN-01 a RN-05)

| Regla | Descripción | Invariante / Excepción |
| :--- | :--- | :--- |
| **RN-01** | **Fecha de vencimiento futura:** No permite crear ni actualizar tareas con fecha en el pasado. | Lanza `TaskValidationException`: `"La fecha de vencimiento no puede ser en el pasado"`. |
| **RN-02** | **Estado terminal inmutable:** Una tarea `COMPLETADA` o `CANCELADA` no puede revertirse a `EN_PROCESO` o `PENDIENTE`. | Lanza `IllegalStateException`: `"No se puede reabrir una tarea completada"`. |
| **RN-03** | **No traslape horario:** Detección de colisiones para compromisos `PROGRAMADO` o `CONFIRMADO` con la fórmula `(NuevoIni < ExistFin) && (NuevoFin > ExistIni)`. Intervalos consecutivos adyacentes (`10:00-11:00` y `11:00-12:00`) son válidos. | Lanza `ScheduleConflictException`: `"El horario solicitado se traslapa con el compromiso '[Título]'"`. |
| **RN-04** | **Duración mínima:** La franja mínima debe ser de 15 minutos (`(fechaFin - fechaInicio) >= 15 min`). | Lanza `IllegalArgumentException`: `"Duración mínima 15 mins"`. En UI: `"La duración mínima de un compromiso debe ser de 15 minutos"`. |
| **RN-05** | **Validación RFC 5322 de asistentes:** Todo compromiso requiere al menos 1 participante y todos los correos deben ser válidos. | Rechaza sintaxis inválida y previene agendamientos espurios. |

---

## 📂 Estructura de Directorios

```text
agenda-tareas-compromisos/
├── src/
│   ├── domain/
│   │   ├── entities.ts            # Entidades Task y Commitment, Enums y Types
│   │   └── exceptions.ts          # TaskValidationException, ScheduleConflictException
│   ├── services/
│   │   ├── TaskService.ts         # RN-01, RN-02, createTask, updateStatus, getPendingOverdue
│   │   └── CommitmentService.ts   # RN-03, RN-04, RN-05, schedule, cancel, hasConflict
│   ├── repositories/
│   │   ├── ITaskRepository.ts     # Contrato desacoplado de persistencia
│   │   ├── ICommitmentRepository.ts
│   │   └── InMemoryRepositories.ts # Implementaciones in-memory para mocks y tests
│   └── ui/
│       ├── components/            # Componentes accesibles con paleta Blanco/Azul
│       └── app.ts                 # Enrutamiento y control reactivo
├── tests/
│   └── unit/
│       ├── TaskService.test.ts    # TDD-T01 a TDD-T04 (100% Cobertura)
│       └── CommitmentService.test.ts # TDD-C01 a TDD-C04 (100% Cobertura)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 🛠️ Instalación y Requisitos

- **Node.js**: v18.0.0 o superior
- **Gestor de paquetes**: `npm`, `pnpm` o `yarn`

### 1. Clonar o descargar el repositorio
```bash
git clone https://github.com/tu-organizacion/agenda-tareas-compromisos.git
cd agenda-tareas-compromisos
```

### 2. Instalar dependencias
```bash
npm install
```

---

## 🧪 Ejecución de la Suite TDD (Vitest)

Ejecutar la verificación formal de todas las reglas de negocio:

```bash
# Ejecutar pruebas una sola vez
npm test

# Ejecutar con reporte detallado de cobertura
npm run test:coverage

# Modo interactivo en desarrollo (watch mode)
npm run test:watch
```

### Casos de Prueba Verificados (8/8 Pass):
- `TDD-T01`: `createTask_conFechaPasada_lanzaTaskValidationException`
- `TDD-T02`: `createTask_conDatosValidos_creaTareaConEstadoPendiente`
- `TDD-T03`: `updateTaskStatus_tareaCompletadaHaciaEnProceso_lanzaIllegalStateException`
- `TDD-T04`: `getPendingTasksOverdue_retornaSoloTareasPendientesConFechaPasada`
- `TDD-C01`: `scheduleCommitment_duracionMenor15Mins_lanzaIllegalArgumentException`
- `TDD-C02`: `scheduleCommitment_emailParticipanteInvalido_lanzaValidationException`
- `TDD-C03`: `scheduleCommitment_traslapeHorario_lanzaScheduleConflictException`
- `TDD-C04`: `scheduleCommitment_horarioConsecutivoSinTraslape_guardaExitosamente`

---

## 💻 Ejecución de la Aplicación Web

```bash
# Modo desarrollo con recarga en caliente
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```

La aplicación estará disponible de forma predeterminada en `http://localhost:5173`.

---

## 🎨 Especificación Visual de la Interfaz
- **Fondo principal:** Blanco `#FFFFFF` y superficies `#F8F9FF`.
- **Acentos e interacción:** Azul operativo `#0284C7` con contrastes en `#0369A1` y `#E0F2FE`.
- **Alertas y validación:** Rojo de conflicto `#EF4444` / `#DC2626` para excepciones de dominio.

---

## 📄 Licencia
Proyecto desarrollado bajo licencia MIT. Cumplimiento de especificaciones SDD/BDD/TDD verificado.
