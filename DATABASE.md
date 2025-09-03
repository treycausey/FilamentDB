# FilamentDB Database Setup

FilamentDB now uses **Supabase** for reliable cloud database storage instead of localStorage.

## 🚀 Quick Setup

1. **Visit Setup Page**: Open `database-setup.html` in your browser
2. **Create Supabase Account**: Go to [supabase.com](https://supabase.com) (free)
3. **Create Project**: New project in Supabase dashboard
4. **Run SQL Schema**: Copy/paste the provided SQL in Supabase SQL Editor
5. **Configure**: Enter your project URL and anon key
6. **Auto-Migration**: Your existing localStorage data will be migrated automatically

## 🎯 Benefits

- ✅ **Real-time sync** across all devices
- ✅ **No more data loss** from localStorage issues
- ✅ **Automatic migration** from existing data
- ✅ **Offline fallback** - works without internet
- ✅ **Proper database queries** with filtering
- ✅ **Scalable** - handles thousands of entries

## 🗄️ Database Schema

```sql
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  manufacturer TEXT,
  material TEXT, 
  color TEXT,
  hex_color TEXT,
  temp1 INTEGER,
  temp2 INTEGER,
  spool_count INTEGER DEFAULT 1,
  remaining_percentage INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Technical Details

- **Client**: `@supabase/supabase-js` 
- **Fallback**: Uses localStorage if Supabase not configured
- **Migration**: Automatic one-time migration on first connection
- **Real-time**: Live updates via Supabase subscriptions
- **Security**: Row Level Security enabled

## 📱 Status Indicator

The app shows a database status indicator in the bottom-right:
- 🗄️ **Green**: Connected with entry count
- 💾 **Orange**: Local-only mode (click to set up database)
- ❌ **Red**: Database connection error

## 🔄 Migration Process

1. App checks for existing localStorage data (`qrCodeEntries`)
2. If Supabase is configured and database is empty, auto-migrate
3. Creates backup as `qrCodeEntries_backup`
4. All new data goes to Supabase with localStorage fallback

## 🌐 Real-time Sync

Once configured, all devices with the same Supabase project will:
- See real-time updates
- Sync changes automatically  
- Work offline with sync when reconnected

Your inventory is now enterprise-grade! 🎉