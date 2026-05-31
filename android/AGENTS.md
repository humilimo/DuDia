# android/ — Projeto nativo gerado

**Não edite arquivos aqui à mão.** Esta pasta é gerada por `npx expo prebuild --platform android` a partir de [`app.json`](../app.json).

## Quando mexer

- **Nunca** para mudanças que pertencem a `app.json` (permissões, ícones, nome, package, plugins).
- **Raramente** para tweaks de Gradle/Manifest que o Expo ainda não suporta declarativamente — e nesse caso documente em `app.json > expo.plugins` com um config plugin.

## Para regenerar

```bash
npx expo prebuild --platform android --clean
```

Isso recria `android/` do zero a partir de `app.json` e dos `expo-*` plugins. Edições manuais perdidas são intencionais.

## Build local

```bash
cd android && ./gradlew assembleRelease
```

APK em `android/app/build/outputs/apk/release/app-release.apk`.
