const fs = require('fs');
const config = {
  "\u0024schema": "https://schema.tauri.app/config/2",
  productName: "小账本",
  version: "1.0.0",
  identifier: "com.xiaozhangben.app",
  build: {
    frontendDist: "../dist",
    devUrl: "http://localhost:5173",
    beforeDevCommand: "npm run dev",
    beforeBuildCommand: "npm run build"
  },
  app: {
    windows: [{
      title: "小账本 - 温暖的生活记账",
      width: 480,
      height: 800,
      resizable: true,
      fullscreen: false,
      center: true
    }],
    security: { csp: null }
  },
  bundle: {
    active: true,
    targets: "all",
    icon: ["icons/32x32.png","icons/128x128.png","icons/128x128@2x.png","icons/icon.icns","icons/icon.ico"]
  }
};
fs.writeFileSync("src-tauri/tauri.conf.json", JSON.stringify(config, null, 2), "utf-8");
const check = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json","utf-8"));
console.log("schema key:", Object.keys(check)[0]);
console.log("productName:", check.productName);