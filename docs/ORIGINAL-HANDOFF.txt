SHADOW OATH - INSTALL ON IPHONE (no Mac needed, free)

A) Put the game online (one time, ~5 minutes, free)
 1. Make a free account at https://github.com
 2. Click "+" (top right) > New repository. Name it: shadow-oath. Set it to Public. Create.
 3. Click "uploading an existing file" and drag in ALL 7 files from this folder:
      index.html  manifest.webmanifest  sw.js  icon-192.png  icon-512.png  apple-touch-icon.png  README.txt
    Then click "Commit changes".
 4. Go to Settings > Pages. Under "Branch" pick "main" and "/ (root)", click Save.
 5. Wait 1-2 minutes. Your game is at:  https://YOUR-USERNAME.github.io/shadow-oath/

B) Install it on the iPhone
 1. Open that link in SAFARI (not Chrome).
 2. Tap the Share button (square with arrow) > "Add to Home Screen" > Add.
 3. Open Shadow Oath from your home screen: full screen, landscape, works offline.

Saves: kept inside the installed app on the phone. Don't delete the app's icon or you lose the save.
Backup: Menu > Settings > Save code > Copy. Keep it in Notes. Paste it with "Load from save code".
Note: this version saves on the phone only; the claude.ai link has the cloud save.

Updating later: upload the new index.html to the same GitHub repo (replace), and in sw.js
change VERSION to a new name (e.g. shadow-oath-v2). The app updates next time you open it.

Want a real App Store app instead? That needs a Mac with Xcode and an Apple Developer
account ($99/year). Ask Claude for the Capacitor/Xcode project if you get a Mac.
