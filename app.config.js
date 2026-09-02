const appJson = require("./app.json");

const versionCode = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? "1", 10);

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      versionCode: Number.isFinite(versionCode) && versionCode > 0 ? versionCode : 1,
    },
  },
};
