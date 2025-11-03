## Komponenty UI – struktura i zależności

### Drzewo komponentów (src/components)
```
src/components
├─ Welcome.astro
├─ Header.tsx
├─ Breadcrumbs.tsx
├─ QueryProvider.tsx
├─ hooks/
│  ├─ useAuth.ts
│  └─ useCurrentPath.ts
├─ ui/               (Shadcn UI – atomy)
│  ├─ avatar.tsx
│  ├─ badge.tsx
│  ├─ button.tsx
│  ├─ card.tsx
│  ├─ dialog.tsx
│  ├─ dropdown-menu.tsx
│  ├─ input.tsx
│  ├─ progress.tsx
│  ├─ skeleton.tsx
│  └─ tooltip.tsx
├─ auth/
│  ├─ AuthLoginForm.tsx
│  ├─ AuthRegisterForm.tsx
│  ├─ AuthResetRequestForm.tsx
│  └─ AuthResetConfirmForm.tsx
├─ onboarding/
│  ├─ OnboardingPage.tsx
│  ├─ PlanGeneratorForm.tsx
│  ├─ StartDateSelector.tsx
│  ├─ BlockingLoader.tsx
│  └─ useOnboardingForm.ts
├─ dashboard/
│  ├─ LeftSidebar.tsx
│  ├─ PlansToolbar.tsx
│  ├─ PlansList.tsx
│  ├─ PlansListContent.tsx
│  ├─ PlanCard.tsx
│  ├─ PaginationControls.tsx
│  ├─ BottomCTA.tsx
│  ├─ SkeletonList.tsx
│  ├─ usePlansQuery.ts
│  └─ types.ts
├─ planOverview/
│  ├─ PlanOverviewContent.tsx
│  ├─ PlanHeader.tsx
│  ├─ PlanCalendarStrip.tsx
│  ├─ DaysList.tsx
│  ├─ DayCard.tsx
│  ├─ MealMiniature.tsx
│  ├─ ActionMenu.tsx
│  ├─ ConfirmDialog.tsx
│  ├─ DateBadge.tsx
│  ├─ LoadingState.tsx
│  ├─ ErrorState.tsx
│  ├─ usePlanOverview.ts
│  ├─ usePlanActions.ts
│  ├─ utils.ts
│  ├─ transforms.ts
│  ├─ dateUtils.ts
│  └─ types.ts
└─ planDay/
   ├─ PlanDayPage.tsx
   ├─ PlanDayView.tsx
   ├─ DayNavigator.tsx
   ├─ MealSlot.tsx
   ├─ MealCard.tsx
   ├─ RecipePreviewModal.tsx
   ├─ SwapModal.tsx
   ├─ hooks.ts
   └─ types.ts
```

### Powiązanie stron z komponentami (src/pages → components)
```
index.astro                  -> components/Welcome.astro, Header
dashboard.astro              -> components/dashboard/*
onboarding.astro             -> components/onboarding/*

auth/login.astro             -> components/auth/AuthLoginForm
auth/register.astro          -> components/auth/AuthRegisterForm
auth/reset.astro             -> components/auth/AuthResetRequestForm
auth/reset/callback.astro    -> components/auth/AuthResetConfirmForm

plans/[id].astro             -> components/planOverview/*
plans/[id]/days/[date].astro -> components/planDay/*
```

### Zależności funkcjonalne (skrót)
```
[Pages *.astro] --> [Feature React Components] --> [Shadcn UI atoms] --> [CSS/Tailwind]
                                |                         ^
                                v                         |
                          [Feature hooks/utils]-----------+
```


