# Build
Following are the commands to build release apk
```
npm install --legacy-peer-dep
npx expo prebuid
cd android && ./gradlew assembleRelease && cd ..
```

