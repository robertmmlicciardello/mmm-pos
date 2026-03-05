# MMM - မေမြန်မာဆိုင် (Mae Myanmar Shop) POS App

## Overview
Offline Restaurant Point of Sale mobile app built with Expo React Native + Express backend. Full Burmese (Myanmar) language UI. Currency: Kyat (ks).

## Architecture
- **Frontend**: Expo React Native (file-based routing via expo-router)
- **Backend**: Express + TypeScript on port 5000
- **State**: React Context (POSContext) + AsyncStorage persistence
- **UUID**: expo-crypto for `Crypto.randomUUID()`

## POS Workflow
1. Main POS screen shows product menu grid (3 columns, compact cards) with search box and category filters
2. Tap items to add to cart (floating cart bar at bottom shows count/total)
3. Open cart → three checkout options:
   - **စားပွဲ (Send to Table)**: Pick a table number (1–20), cart items assigned to that table
   - **အကြွေး (Credit)**: Pick/create a credit customer, bill recorded as debt
   - **ပါဆယ် (Takeaway)**: Immediate checkout, order saved to history
4. **Active Tables** button (top-right) shows occupied tables → tap table → view bill → settle or credit
5. **Credit Ledger** button (wallet icon, top-right) shows all credit customers, balances, transaction history, and payment recording

## Key Files
- `app/(tabs)/index.tsx` - POS screen (menu, search, cart, table picker, settle)
- `app/(tabs)/history.tsx` - Order history with date filtering (day/month/year) and export
- `app/(tabs)/products.tsx` - Product/menu management with category management
- `app/(tabs)/staff.tsx` - Employee/HRM management + Backup/Restore
- `context/POSContext.tsx` - All state management (cart, tables, orders, products, employees, categories, credit)
- `lib/storage.ts` - AsyncStorage persistence layer (products, orders, tables, employees, categories, credit)
- `lib/backup.ts` - Data export/import for backup/restore
- `constants/colors.ts` - Dark theme colors (accent: #FF6B35)
- `app/(tabs)/_layout.tsx` - Tab navigation layout (4 tabs)

## Tabs
1. အရောင်း (Sales) - POS screen
2. စာရင်း (Records) - Order history with date filters
3. မီနူး (Menu) - Product & Category management
4. ဝန်ထမ်း (Staff) - Employee/HRM management + Backup/Restore

## Theme
- Dark restaurant theme: background #0A0A0A, surface #1A1A1A, accent #FF6B35
- Orange accent color throughout

## Data Model
- **Product**: id, name, price, category, color, createdAt
- **Order**: id, items, total, createdAt, note, orderType (dine-in/takeaway), tableNumber?, creditCustomerId?
- **ActiveTable**: tableNumber, items, openedAt, note?
- **Cart**: in-memory array of {product, quantity}
- **Employee**: id, name, phone, role, salary, startDate, active, createdAt
- **CreditCustomer**: id, name, phone, createdAt
- **CreditTransaction**: id, customerId, amount, type (credit/payment), orderId?, note?, createdAt
- **Categories**: string[] stored in AsyncStorage (pos_categories key)

## Categories (Burmese, user-editable)
Default: ထမင်းများ, အသား/ဟင်း, အချိုရည်, အရက်/ဘီယာ, အစာအလတ်, အထူး
- Categories can be added, renamed, and deleted via Products tab
- Products tab has a dedicated category management modal (tag icon button)
- When adding products, users can create custom categories inline

## Employee Roles (Burmese)
စားပွဲထိုင်, မီးဖို, စားချက်, အောက်မှူ, လက်ထောက်လုပ်စား, မန်နေဂျာ

## Backup / Restore
- Export: All data serialized to JSON → shared via device share sheet (Google Drive, Viber, etc.)
- Import: Pick JSON backup file → data restored to AsyncStorage
- Located in Staff tab (ဝန်ထမ်း) as "Data Backup" section
- lib/backup.ts handles export/import logic
- Web: uses download/file-input; Native: uses expo-sharing/expo-document-picker

## APK Build
- eas.json configured with `preview` profile (APK) and `production` profile (AAB)
- Build: `eas build --platform android --profile preview`
- EAS Project ID: 11c8e46d-04ad-40e9-8e19-6e6512a49920 (owner: powerranger)
- App is fully offline - all data stored in AsyncStorage, no server dependency

## Storage Keys
- pos_products, pos_orders, pos_active_tables, pos_employees
- pos_categories, pos_credit_customers, pos_credit_transactions

## Dependencies
- expo-crypto, expo-haptics, @expo/vector-icons, @tanstack/react-query
- react-native-reanimated, expo-router, react-native-safe-area-context
- expo-file-system, expo-sharing, expo-document-picker
