# Pío para iPhone

La práctica vive en https://pio.today; esta app le da casa en el teléfono: icono y arranque propios, el micrófono pedido una sola vez, sonido por la bocina, vibración y una pantalla tranquila cuando no hay conexión.

- `Pio/` — el código (SwiftUI + WKWebView), los recursos y los textos traducidos.
- `make_project.py` — escribe `Pio.xcodeproj` y los textos. Para cambiar versión, identificador o permisos, edítalo y córrelo: `python3 make_project.py`.
- `tienda/` — la ficha y las capturas para App Store Connect.

## Compilar y probar

Si `xcode-select` no apunta a Xcode, antepón `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` a cada comando.

```bash
xcodebuild -project Pio.xcodeproj -scheme Pio -destination "platform=iOS Simulator,name=iPhone 18 Pro" -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

```bash
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/Pio.app
```

```bash
xcrun simctl launch booted today.pio.app
```

Solo en la compilación de pruebas, tres variables permiten ensayar sin tocar la pantalla (se pasan con el prefijo `SIMCTL_CHILD_`): `PIO_PAIR=es-MX:de-DE` elige idiomas, `PIO_TAP=1` toca Hablar y `PIO_SCRIPT=/ruta/archivo.js` corre un guion antes de la página.

## Subir a la tienda

Hace falta una cuenta del Apple Developer Program iniciada en Xcode (Ajustes › Cuentas). Con eso:

```bash
xcodebuild -project Pio.xcodeproj -scheme Pio -configuration Release -destination "generic/platform=iOS" -archivePath build/Pio.xcarchive -allowProvisioningUpdates DEVELOPMENT_TEAM=TU_EQUIPO archive
```

```bash
xcodebuild -exportArchive -archivePath build/Pio.xcarchive -exportOptionsPlist tienda/subir.plist -exportPath build/subida -allowProvisioningUpdates
```
