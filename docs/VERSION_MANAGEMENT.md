# Version Management Quick Reference

## 🚀 Quick Commands

### Check Current Versions
```bash
# App version
cat package.json | grep '"version"'

# Engine versions
cat resources/win/version.txt
cat resources/mac/version.txt
cat resources/linux/version.txt
```

### Update Versions

#### Update App Version
```bash
# Edit package.json manually or use npm
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0
```

#### Update Engine Versions
```bash
# Windows
echo "1.1.0" > resources/win/version.txt

# macOS
echo "1.1.0" > resources/mac/version.txt

# Linux
echo "1.1.0" > resources/linux/version.txt
```

## 🔧 Configuration Checklist

### Before Production Deployment
- [ ] Update Vercel URL in `main.js` (line ~232):
  ```javascript
  const url = app.isPackaged 
    ? 'https://your-actual-vercel-url.vercel.app/api/required-versions'
    : 'http://localhost:3000/api/required-versions';
  ```

- [ ] Update download URL in `app/api/required-versions/route.ts`:
  ```typescript
  downloadUrl: 'https://github.com/your-org/jobelix/releases/latest'
  ```

- [ ] Test version blocking in development:
  1. Set package.json version to `0.0.1`
  2. Set API required version to `0.1.0`
  3. Run `npm run dev`
  4. Verify update screen appears

## 📦 Release Workflow

### Full Release (App + Engine)
1. **Update Versions**
   ```bash
   npm version minor
   echo "X.Y.Z" > resources/*/version.txt
   ```

2. **Test Locally**
   ```bash
   npm run dev
   # Verify app loads correctly
   ```

3. **Build Installers**
   ```bash
   npm run build-installer
   # Check dist/ folder for installers
   ```

4. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Release vX.Y.Z"
   git push
   ```

5. **Upload Installers**
   - Create GitHub release
   - Upload files from `dist/` folder
   - Tag with version number

6. **Enforce Update (Optional)**
   - Edit `app/api/required-versions/route.ts`
   - Update minimum required versions
   - Deploy to Vercel
   - Users will be prompted on next launch

### Engine-Only Update
1. Update `resources/*/version.txt`
2. Replace engine executables
3. Build installers
4. Update API endpoint if enforcement needed

### App-Only Update
1. `npm version [patch|minor|major]`
2. Make code changes
3. Build installers
4. Update API endpoint if enforcement needed

## 🧪 Testing Scenarios

### Test 1: Compatible Versions
```
Current App: 0.1.0, Required: 0.1.0 → ✅ Should load
Current App: 1.5.0, Required: 1.0.0 → ✅ Should load
```

### Test 2: Incompatible App
```
Current App: 0.1.0, Required: 0.2.0 → ❌ Should block
Current App: 1.0.0, Required: 2.0.0 → ❌ Should block
```

### Test 3: Incompatible Engine
```
Current Engine: 1.0.0, Required: 1.1.0 → ❌ Should block
```

### Test 4: Network Failure
```
API unreachable → ✅ Should allow (fail-open)
```

## 🔍 Debugging

### Check Version Check Logs
```bash
# Run app and check console output
npm run dev

# Look for:
🔍 Checking for required updates...
Current App Version: 0.1.0
Current Engine Version: 1.0.0
Required App Version: 0.1.0
Required Engine Version: 1.0.0
✅ App is compatible with server requirements
```

### Common Issues

**Issue**: Version check fails with "Failed to fetch"
- **Solution**: Ensure Next.js dev server is running (`npm run dev`)
- **Solution**: Check Vercel URL is correct in production

**Issue**: Update screen doesn't show version numbers
- **Solution**: Check URL query parameters are passed correctly
- **Solution**: Verify version.txt files exist and contain valid versions

**Issue**: App starts despite old version
- **Solution**: Check API endpoint returns correct minimum versions
- **Solution**: Verify compareVersions() logic is working

## 📊 Version Comparison Examples

```javascript
compareVersions("1.0.0", "1.0.0")  // 0 (equal)
compareVersions("1.0.0", "1.0.1")  // -1 (less than)
compareVersions("1.1.0", "1.0.0")  // 1 (greater than)
compareVersions("2.0.0", "1.9.9")  // 1 (major > minor)
```

## 🎯 Key Files Reference

| File | Purpose |
|------|---------|
| `main.js` | Version checking logic |
| `package.json` | App version storage |
| `resources/*/version.txt` | Engine version storage |
| `app/api/required-versions/route.ts` | API endpoint |
| `update-required.html` | Update screen UI |

## 📞 Support

If users report version issues:
1. Ask for current app version (Help → About)
2. Check API endpoint is accessible
3. Verify minimum required versions are reasonable
4. Review Electron console logs
5. Test with same version locally

---

**Last Updated**: January 11, 2026  
**Maintained By**: Team Poh
