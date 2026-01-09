# 🚀 Deployment Guide for The Quiet Game on Render.com

## ✅ Pre-Deployment Summary

Your application is **READY FOR DEPLOYMENT**! All necessary files have been created and configured:

### 📋 Created/Modified Files:
- ✅ **requirements.txt** - All Python dependencies with exact versions
- ✅ **render.yaml** - Render Blueprint configuration
- ✅ **runtime.txt** - Python 3.11.0 specification
- ✅ **.env.example** - Environment variable template
- ✅ **.gitignore** - Updated to exclude database files
- ✅ **app.py** - Production-ready with PORT configuration
- ✅ **game.js** - Enhanced WebRTC with 5 STUN servers
- ✅ **videocall.js** - Enhanced WebRTC with 5 STUN servers

---

## 🎯 Step-by-Step Deployment Instructions

### **STEP 1: Push to GitHub**

```bash
# Navigate to your project directory
cd "d:\Deployment\The Quiet Game"

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Render deployment with production config"

# Create GitHub repository and push
# (Create a new repo on GitHub first, then:)
git remote add origin https://github.com/YOUR_USERNAME/the-quiet-game.git
git branch -M main
git push -u origin main
```

### **STEP 2: Sign Up for Render**

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** account
4. **Authorize Render** to access your repositories

### **STEP 3: Deploy via Blueprint**

1. In Render Dashboard, click **"New +"** → **"Blueprint"**
2. Select your repository: **"the-quiet-game"**
3. Render will **auto-detect `render.yaml`**
4. Review the configuration:
   - Service Name: `the-quiet-game`
   - Environment: `python`
   - Plan: `Free`
   - Persistent Disk: `1GB` (for SQLite database)
5. Click **"Apply"** to start deployment

### **STEP 4: Monitor Deployment**

- Watch the **build logs** in real-time
- Deployment typically takes **3-5 minutes**
- Wait for **"Your service is live 🎉"** message

### **STEP 5: Verify Deployment**

Your app will be live at:
```
https://the-quiet-game.onrender.com
```

**Test these features:**
- ✅ Homepage loads
- ✅ Create game room
- ✅ Join game with room code
- ✅ Camera access (HTTPS required)
- ✅ Video streaming between players
- ✅ Game mechanics (word selection, guessing)
- ✅ Real-time chat and scoring

---

## 🔧 Configuration Details

### **Environment Variables (Automatic)**
Render automatically sets these:
- `PORT` - Assigned by Render
- `FLASK_ENV` - Set to `production`
- `SECRET_KEY` - Auto-generated securely
- `PYTHON_VERSION` - Python 3.11.0

### **Persistent Disk for Database**
- **Mount Path:** `/opt/render/project/src/instance`
- **Size:** 1GB (free tier)
- **Purpose:** SQLite database persistence across deployments

### **WebRTC Configuration**
- **STUN Servers:** 5 Google public STUN servers for redundancy
- **Success Rate:** ~80% of connections work with STUN alone
- **Limitation:** No TURN servers on free tier (affects users behind strict NAT/firewalls)

---

## ⚠️ Free Tier Limitations

| Feature | Limitation |
|---------|------------|
| **Uptime** | Spins down after 15 min inactivity |
| **Cold Start** | 30-60 seconds wake-up time |
| **Hours/Month** | 750 hours free |
| **RAM** | 512MB |
| **Bandwidth** | 100GB/month |
| **Disk** | 1GB persistent storage |

---

## 🐛 Troubleshooting

### **Issue: Build Fails**
```bash
# Check requirements.txt syntax
cat requirements.txt

# Verify Python version compatibility
# Python 3.11.0 is specified in runtime.txt
```

### **Issue: App Crashes on Startup**
- Check Render logs: Dashboard → Your Service → Logs
- Verify PORT environment variable is being used
- Ensure `eventlet` is installed (required for Socket.IO)

### **Issue: Database Not Persisting**
- Verify disk is mounted at `/opt/render/project/src/instance`
- Check Render Dashboard → Disks section
- Database file: `instance/silent_mood.db`

### **Issue: Video Connections Fail**
- Ensure testing over **HTTPS** (required for WebRTC)
- Check browser console for WebRTC errors
- ~20% of users may fail due to NAT/firewall (no TURN server)
- Try different browser or network

### **Issue: Socket.IO Disconnects**
- Verify `eventlet` is in requirements.txt
- Check CORS settings in app.py (currently allows all origins)
- Monitor WebSocket connection in browser DevTools

---

## 🎮 Post-Deployment Checklist

- [ ] Homepage renders correctly at your Render URL
- [ ] Can create a new game room
- [ ] Room code is generated and displayed
- [ ] Can join existing room with valid code
- [ ] Camera access prompt appears (HTTPS)
- [ ] Local video stream visible
- [ ] Remote video streams connect
- [ ] Can select words as actor
- [ ] Chat messages send/receive
- [ ] Guessing mechanism works
- [ ] Scoring updates correctly
- [ ] Timer counts down properly
- [ ] Round transitions smoothly
- [ ] Game over screen appears
- [ ] Can start new game after completion

---

## 🚀 Optional Enhancements

### **1. Add Custom Domain** (Free on Render)
1. Go to: Dashboard → Your Service → Settings
2. Click **"Custom Domain"**
3. Add your domain (e.g., `thequietgame.com`)
4. Update DNS records as instructed

### **2. Add TURN Server** (Better WebRTC - Paid)
For 100% video connectivity, add a TURN server:

**Option A: Twilio (Pay-as-you-go)**
```javascript
// In game.js and videocall.js
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:global.turn.twilio.com:3478?transport=udp',
            username: 'YOUR_TWILIO_USERNAME',
            credential: 'YOUR_TWILIO_CREDENTIAL'
        }
    ]
};
```

**Option B: Metered.ca (Free Tier)**
- Sign up: https://www.metered.ca/tools/openrelay/
- Get free TURN credentials
- Update JavaScript files

### **3. Enable Auto-Deploy**
- Render automatically deploys on git push to `main` branch
- Already configured in `render.yaml` (branch: main)

### **4. Monitor Performance**
- Render Dashboard → Metrics
- Track CPU, Memory, Response Times
- Set up alerts for downtime

---

## 💰 Upgrade Options

### **Starter Plan ($7/month)**
- No cold starts (always on)
- Better performance
- Priority support

### **If You Outgrow Free Tier:**
- **Railway.app** - $5 credit/month, 500 hours free
- **Fly.io** - Free persistent volumes, global deployment
- **DigitalOcean App Platform** - $5/month for basic plan

---

## 📞 Support & Resources

### **Render Documentation**
- Blueprints: https://render.com/docs/blueprint-spec
- Python Apps: https://render.com/docs/deploy-flask
- Persistent Disks: https://render.com/docs/disks

### **WebRTC Resources**
- STUN/TURN Servers: https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
- Troubleshooting: https://webrtc.github.io/samples/

### **Application Logs**
```bash
# View live logs in Render Dashboard
Dashboard → Your Service → Logs → Stream

# Or use Render CLI
render logs -t <service-name>
```

---

## 🎉 You're All Set!

Your **"The Quiet Game"** is production-ready and configured for Render.com deployment.

**Next Steps:**
1. Push code to GitHub
2. Connect repository to Render
3. Deploy via Blueprint
4. Share your game URL with friends!

**Questions or Issues?**
- Check Render logs first
- Review troubleshooting section above
- Test locally with: `FLASK_ENV=production python app.py`

---

**Good luck with your deployment! 🚀🤟**
