# Xuunu Health Tracking Platform - Design Guidelines

## Design Approach
**Reference-Based Approach**: Draw inspiration from extreme minimalism in health tech, Apple Health's data clarity, and clinical dashboard interfaces. Emphasis on data primacy, professional aesthetics, and restrained visual design suitable for medical-grade health tracking.

## Core Design Principles
1. **Data First**: Metrics and insights dominate; UI chrome is invisible
2. **Clinical Precision**: Professional appearance builds trust for medical integration
3. **Extreme Restraint**: Every element must justify its existence
4. **Enterprise-Grade**: Suitable for Epic/Cerner integration and professional healthcare use

## Color System

### Three-Color Palette
- **Primary Blue**: #0066FF (interactive elements, primary actions, data highlights)
- **Pure Black**: #000000 (primary text, strong emphasis, backgrounds)
- **Pure White**: #FFFFFF (backgrounds, contrast elements, secondary text)

### Functional Applications
- **Backgrounds**: Black (#000000) for app shell, White (#FFFFFF) for data cards
- **Text**: White on black backgrounds, Black on white cards
- **Interactive Elements**: Blue for all buttons, links, active states
- **Data Visualization**: Monochromatic blue gradients (20% to 100% opacity)
- **Borders**: 1px solid rgba(255,255,255,0.1) on dark, rgba(0,0,0,0.08) on light
- **Status Indicators**: Blue intensity variations only (no red/green/yellow)

## Typography

### Font Stack
-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui

### Type Scale
- **Hero Metrics**: 72px/bold (environmental synergy level, primary health scores)
- **Data Points**: 48px/semibold (glucose readings, key vitals)
- **Page Titles**: 24px/bold (screen headers)
- **Section Labels**: 11px/uppercase/semibold/tracking-wide (category headers)
- **Body Text**: 15px/regular (descriptions, settings)
- **Metric Labels**: 13px/medium (data point descriptors)
- **Captions**: 11px/regular (timestamps, helper text)

### Typography Rules
- Generous line-height: 1.6 for body, 1.2 for headings
- Uppercase section labels with increased letter-spacing
- Monospace for all numeric health data
- Maximum line length: 60 characters for readability

## Layout System

### Spacing Units (Tailwind)
Use: **4, 8, 16, 24, 32** (p-1, p-2, p-4, p-6, p-8)

### Grid Structure
- **Container**: max-w-lg (512px) for mobile, max-w-4xl for desktop dashboard
- **Card Padding**: p-8 (32px) - generous breathing room
- **Section Spacing**: space-y-8 to space-y-12
- **Vertical Rhythm**: Consistent 32px between major sections

### iOS PWA Optimization
- **Safe Areas**: pt-safe-or-16 top, pb-safe-or-20 bottom
- **Full-Screen Immersion**: Black status bar, minimal chrome
- **Bottom Navigation**: Invisible until interaction (gesture-based)

## Component Library

### Navigation
**Minimal Tab Bar** (Hidden by default, appears on swipe-up)
- Height: 60px + safe area
- Black background with white icons
- Four tabs: Dashboard, Track, Data, Account
- Active state: Blue underline (2px), white icon
- Inactive: 40% opacity white icons

### Cards
**Data Container**
- White background on black app shell
- Border-radius: 16px
- Padding: 32px
- No shadows - relies on contrast
- Single pixel border: rgba(0,0,0,0.08)

**Metric Cards**
- Minimal border container
- Large number display (48px)
- Tiny uppercase label (11px)
- Comparison indicator: ↑/↓ with percentage

### Forms & Inputs

**Text Inputs**
- Height: 52px
- Border: 1px solid rgba(255,255,255,0.2) on dark, rgba(0,0,0,0.1) on light
- Border-radius: 8px
- Padding: 16px
- Focus: Border changes to blue
- Label: 11px uppercase, tracking-wide

**Buttons**
- **Primary**: Blue background, white text, height 52px, border-radius 26px (pill shape)
- **Secondary**: Transparent with 1px blue border, blue text
- **Text Only**: Blue text, no background or border
- All full-width on mobile, auto-width on desktop
- Blur background when overlaying images: backdrop-blur-md bg-black/30

**Toggles & Switches**
- iOS-style toggle: 51x31px
- Off: Gray track, On: Blue track
- Smooth animation: 200ms ease

### Data Display

**Ring Progress Indicators** (Biological Age, Health Scores)
- Diameter: 200px for hero metrics
- Stroke-width: 8px
- Color: Blue gradient
- Center: Large number + small label
- No background circle - floats on black

**Timeline/History List**
- Minimal dividers: 1px rgba lines
- Left-aligned date stamps (11px, 40% opacity)
- Right-aligned metric (48px bold)
- Tap expands for detail view
- Infinite scroll with lazy loading

**Charts**
- Line graphs: Single blue line, no grid
- Area charts: Blue gradient fill (100% to 0% opacity)
- No axes labels except endpoints
- Gesture-based scrubbing for details
- Minimal legend: inline with data

### Status & Feedback

**Loading States**
- Circular spinner: Blue, 32px, centered
- Skeleton: Subtle gray shimmer on metric placeholders
- No progress bars - binary loading states only

**Empty States**
- Large icon: 120px, blue at 20% opacity
- Single line heading: 24px
- Brief description: 15px, 60% opacity
- Single CTA button below

**Alerts**
- Full-width banner at top
- Blue background at 10% opacity
- Icon + message + dismiss
- Slide-down animation

## Screen Layouts

### Dashboard (Home)
- Black background
- Top: Environmental Synergy Level ring (hero), centered - shows completion percentage
- Toggle button to switch between Synergy Ring and Bio Signature
- Below: 2x2 grid of key metrics (glucose, activity, recovery, strain)
- Environmental conditions: Minimal card with AQI number + location
- Quick action button: "Track Entry" (blue, prominent)
- Recent timeline: Last 5 entries, collapsed view

### Pollutants Screen (NEW - Primary Environmental Interface)
- **Dedicated bottom navigation tab** for quick access
- **Location Toggle**: Switch between outdoor (GPS API) and indoor (manual) modes
- **7 Category Grid** (2 columns):
  - VOCs & Air Quality: VOCs hero + AQI, PM2.5
  - Noise Pollution: Current dB hero + peak
  - Water Quality: Quality index hero + pH
  - Soil Quality: Contaminants hero + heavy metals
  - Light Exposure: UV index hero + light pollution
  - Thermal Conditions: Temperature hero + humidity
  - Radiation Exposure: Radon hero + gamma
- **Card Interactions**:
  - Each card is tappable to open detailed modal
  - Modal shows hero metric + all secondary metrics
  - "Add Manual Reading" button for user input
  - Color-coded quality levels (blue scale only)
- **No Location Gating**: Works without GPS for indoor measurements

### Environmental Map Screen (Location-Based Tracking)
- Three-tab interface: Location, Health Data, Impact
- **Location Tab**: 
  - Geolocation with map embed (OpenStreetMap)
  - Coordinates display with precision to 6 decimals
  - Link to open in Google Maps
- **Health Data Tab** (4 sub-tabs):
  - **Air**: AQI hero metric, PM2.5/PM10, gas pollutants (SO₂, NO₂, NOx, CO, O₃), VOCs
  - **Noise**: Current dB level hero, peak, average
  - **Water**: Water quality index hero, pH, turbidity, chlorine, lead, bacteria
  - **More**: 
    - Soil quality (moisture, pH, contaminants, heavy metals)
    - Light exposure (UV index, lux, light pollution, blue light)
    - Thermal conditions (temperature, feels-like, humidity, pressure)
    - Radioactive exposure (radon, gamma, cosmic rays)
- **Impact Tab**:
  - Past hour tracking (15-minute intervals)
  - Health metrics + environmental data correlation
  - Impact score (0-100%) showing environmental effect on health
  - Trend indicators using blue intensity (not red/green)

### Track Entry Screen
- White background
- Sticky header with title
- Single-column form layout
- Sections: Glucose, Symptoms (multi-select chips), Activity, Notes
- Large numeric inputs with +/- steppers
- Floating "Save" button (blue pill)

### Data/Insights Screen
- Black background
- Filter chips at top (time range)
- Scrollable chart view (glucose trends)
- Correlation cards below (minimal design)
- Epic/Cerner sync status banner
- Export data option (secondary button)

### Account Management
- White background
- Profile section: Avatar (optional), name, email
- Settings list: Clean, divided sections
- Location settings with map preview
- Connected devices list (medical integrations)
- Integration status: Epic/Cerner connection badges
- Logout: Text-only button at bottom

### Login Screen
- Black background with white card
- Centered form (max-w-sm)
- Email/password inputs
- Single "Sign In" button
- "Forgot password" text link below
- Healthcare provider login option (separate flow)

## Data Integration Features

### Medical Device Integration Display
- List view with device icons
- Connection status: "Connected" in blue, "Disconnected" in 40% white
- Last sync timestamp
- Tap to configure/disconnect

### Epic/Cerner Integration UI
- Provider search/select during onboarding
- OAuth connection flow (external)
- Data import progress indicator
- Permissions management list
- Sync frequency settings

### Environmental Synergy Level
- Hero metric on dashboard as completion ring (0-100)
- Breakdown card: Contributing factors as percentage bars
- Environmental alignment score based on health metrics + environmental conditions
- Monthly trend graph
- Educational tooltip explaining calculation

## Accessibility

### Touch Targets
- Minimum: 44x44px (iOS standard)
- Preferred: 52px for primary actions
- 16px spacing between interactive elements

### Contrast
- White on black: 21:1 ratio
- Blue on white: 4.8:1 ratio
- All text exceeds WCAG AAA

### Focus & Navigation
- 2px blue outline on focus
- Keyboard navigation support
- Screen reader labels on all icons

## Images

### Hero Image Usage
**NOT RECOMMENDED** for Xuunu - the Whoop-inspired minimalism emphasizes data visualization over imagery. The dashboard should feature the Biological Age ring graphic as the primary visual element rather than photographic imagery.

### Supporting Images
- **Device Integration**: Small device icons (48x48px, monochrome)
- **Empty States**: Minimalist line icons (120px)
- **Profile**: Optional avatar (80px circular)
- **Provider Logos**: Epic/Cerner badges (grayscale, 32px height)

All images should be SVG or high-DPI PNG, maintain the blue/black/white aesthetic, and serve functional rather than decorative purposes.

## Progressive Web App

### App Shell
- Display: standalone (fullscreen)
- Background: Black
- Status bar: Black translucent
- Splash screen: Blue logo on black
- Theme color: #000000

### Performance
- Instant load with cached shell
- Optimistic UI updates
- Background sync for medical data
- Offline queue for entries

This design creates a professional, data-centric health platform with clinical precision and extreme visual restraint, suitable for medical integration and professional healthcare use.