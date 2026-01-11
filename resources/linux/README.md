# Python Auto-Apply Bot - Linux

## Location
The compiled Python bot is located at: `resources/linux/main/`

## Running the Bot

### Command
```bash
./resources/linux/main/main --playwright TOKEN_FROM_USER
```

### Configuration
The bot reads its configuration from:
```
resources/linux/main/data_folder/config.yaml
```

This file is **automatically generated** when you save your work preferences in the dashboard.

## Generated Files

The bot will create/update the following files during execution:

- `data_folder/config.yaml` - Auto-generated from work preferences
- `chrome_profile/` - Browser profile data
- `debug_html/` - HTML snapshots for debugging
- `tailored_resumes/` - Generated resume PDFs
- `log.txt` - Application logs

## Notes

- All generated files are git-ignored
- The compiled app (`main/`) should be manually placed here (not in git)
- Config is synced from the dashboard automatically
