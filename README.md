# Noname (MVP)

## Requisitos iOS
- iOS 16+
- Swift 5.7+
- Xcode 14+

## Pasos de configuración (FamilyControls / ManagedSettings / DeviceActivity)
1. En tu target principal, habilita **Family Controls** y **Managed Settings** en Signing & Capabilities.
2. Crea un **Device Activity Monitor Extension**:
   - File > New > Target > Device Activity Monitor Extension.
   - Mueve `Services/DeviceActivityMonitorExtension.swift` a ese target.
3. Asegúrate de tener un **App Group** compartido si necesitas comunicar estado entre app y extensión.
4. Revisa los entitlements generados:
   - `com.apple.developer.family-controls`
   - `com.apple.developer.deviceactivity-monitoring`
   - `com.apple.developer.managed-settings`

> Nota: sin estos entitlements, el proyecto compila pero las restricciones no se aplicarán.

## Limitaciones conocidas
- iOS no permite bloquear apps esenciales del sistema (por ejemplo Teléfono/Mensajes). Se recomienda excluirlas en la selección.
- El temporizador real requiere la extensión de Device Activity Monitor (ver pasos arriba).
- Validación de fotos es manual (MVP).

## Próximos pasos
- Sustituir `DummyManualClassifier` por un modelo ML real.
- Endurecer anti-trampas (cooldown dinámico, detección de duplicados).
- Analytics local de productividad (sin nube).
