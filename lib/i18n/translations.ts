export type Locale = 'uz' | 'ru' | 'en';

export const LOCALE_NAMES: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export const LOCALE_NATIVE_LABEL: Record<Locale, string> = {
  uz: "O'zbek (Lotin)",
  ru: 'Русский',
  en: 'English',
};

type Dict = {
  common: {
    /** Currency unit suffix appended after a numeric amount, e.g. "20 000 so'm". */
    currencyUnit: string;
    /** Title shown on Alert.alert when something goes wrong. */
    error: string;
    /** OK button label on alerts/dialogs. */
    ok: string;
    /** Retry CTA on error states. */
    retry: string;
    /** Generic cancel label. */
    cancel: string;
    /** Generic confirm label. */
    confirm: string;
    /** Generic loading label. */
    loading: string;
    /** Toast shown when a feature is intentionally gated (e.g. coming-soon sub-tabs). */
    comingSoon: string;
    /** Permission pre-dialog used by every OS-prompt that we wrap. */
    permission: {
      locationTitle: string;
      locationMessage: string;
      cameraTitle: string;
      cameraMessage: string;
      notificationsTitle: string;
      notificationsMessage: string;
      allow: string;
      notNow: string;
      openSettings: string;
      deniedTitle: string;
      deniedMessage: string;
    };
  };
  tabs: {
    home: string;
    discover: string;
    bookings: string;
    wallet: string;
    profile: string;
    /** A11y label for the centre QR / scan action button. */
    scanQrA11y: string;
    /** Short label rendered under the centre QR action when shown. */
    scanQr: string;
  };
  /**
   * "Coming soon" placeholders for features that ship in later
   * milestones. Each entry is rendered by `<ComingSoonView />` —
   * keep title <= 3 words and subtitle <= 2 short sentences so the
   * layout stays tight on small screens.
   */
  soon: {
    aiAssistant: { title: string; subtitle: string };
    aiRecommendations: { title: string; subtitle: string };
    smartSeat: { title: string; subtitle: string };
    smartQueue: { title: string; subtitle: string };
    walletTopup: { title: string; subtitle: string };
    sessionInvites: { title: string; subtitle: string };
    partyBooking: { title: string; subtitle: string };
    rating: { title: string; subtitle: string };
    tournaments: { title: string; subtitle: string };
    bonusPoints: { title: string; subtitle: string };
    referEarn: { title: string; subtitle: string };
    statistics: { title: string; subtitle: string };
    /** Generic short tag used inline (e.g. in profile menu rows). */
    badgeShort: string;
  };
  settings: {
    title: string;
    account: { title: string; subtitle: string };
    preferences: { title: string; subtitle: string };
    privacy: { title: string; subtitle: string };
    payment: { title: string; subtitle: string };
    history: { title: string; subtitle: string };
    notifications: { title: string; subtitle: string };
    language: string;
    about: string;
    versionPrefix: string;
    comingSoon: string;
    logout: string;
    logoutTitle: string;
    logoutMessage: string;
    cancel: string;
    confirmLogout: string;
  };
  language: {
    title: string;
    subtitle: string;
  };
  login: {
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    tabs: { signin: string; signup: string };
    loginPlaceholder: string;
    passwordPlaceholder: string;
    passwordConfirmPlaceholder: string;
    showPasswordA11y: string;
    hidePasswordA11y: string;
    continue: string;
    signupBtn: string;
    divider: string;
    noAccount: string;
    haveAccount: string;
    signupLink: string;
    signinLink: string;
    errorLogin: string;
    errorPassword: string;
    errorPasswordMismatch: string;
    welcomeToast: string;
    registeredToast: string;
    socialSoonToast: string;
    checkingLabel: string;
  };
  home: {
    greetingMorning: string;
    greetingDay: string;
    greetingEvening: string;
    greetingNight: string;
    level: string;
    levelDefault: string;
    clubsTabs: { mine: string; all: string };
    viewAll: string;
    viewAllRemaining: string;
    promotionsTitle: string;
    emptyTitle: string;
    emptySub: string;
    emptyBtn: string;
    emptyBrowseAllLink: string;
    allEmptyTitle: string;
    allEmptySub: string;
    /** Empty state for "other clubs" tab when the user has joined every club already. */
    otherEmptyTitle: string;
    otherEmptySub: string;
    /** CTA on the other-tab empty state — pushes to Discover. */
    otherEmptyBtn: string;
    promoEmptyTitle: string;
    promoEmptySub: string;
    promoEmptyReload: string;
    /** "+N% bonus" label rendered next to a percentage-bonus promotion. */
    promoBonusPercent: string;
    /** "Until DD MMM" label rendered when only the end date is known. */
    promoUntil: string;
    aiTitle: string;
    aiBeta: string;
    aiDescription: string;
    aiAction: string;
    /** Fallback name shown in HomeHeader when no user is loaded yet (cold start / logged out). */
    guestName: string;
    /** A11y label for the avatar button that opens the profile tab. */
    openProfileA11y: string;
    /** A11y label for the bell button when there are zero unread notifications. */
    bellA11y: string;
    /** A11y label for the bell button when unread > 0. `{n}` = badge count. */
    bellWithUnreadA11y: string;
  };
  discover: {
    cityTashkent: string;
    searchPlaceholder: string;
    filters: {
      all: string;
      pc: string;
      ps: string;
      open: string;
      more: string;
    };
    view: { map: string; list: string };
    book: string;
    direction: string;
    open24h: string;
    open: string;
    closed: string;
    emptyTitle: string;
    emptySub: string;
    citySheetTitle: string;
    filterSheetTitle: string;
    filterRating: string;
    filterDistance: string;
    filterReset: string;
    filterApply: string;
    soonBadge: string;
    gpsDeniedTitle: string;
    gpsDeniedSub: string;
    resultsCount: string;
    clearFilters: string;
    swipeHint: string;
    /** "Yo'l ko'rsatish" CTA on the selected club card — initial state. */
    directionsShow: string;
    /** Same button after the route is drawn — toggles the overlay off. */
    directionsHide: string;
    /** Label while the OSRM route fetch is in flight. */
    directionsLoading: string;
    /** Toast when the user taps Directions without having granted GPS yet. */
    directionsNeedGps: string;
    /** Toast when OSRM returns no route (and we fall back to a straight line). */
    directionsErrorRoute: string;
    /** Soft-warn toast when the straight-line fallback is in use. */
    directionsApprox: string;
    /** Subtitle of the route banner when the fallback polyline is shown. */
    directionsApproxHint: string;
    /** Subtitle of the route banner — "From you to {club}". `{club}` placeholder substituted at render. */
    directionsFromYou: string;
    /** A11y label on the recenter (GPS) button — collapses to user position. */
    recenterA11y: string;
    /** A11y label on the + zoom button. */
    zoomInA11y: string;
    /** A11y label on the − zoom button. */
    zoomOutA11y: string;
    /** Short minute suffix used in the "5.2 km · 12 min" route summary. */
    minutesShort: string;
    /** Short hour suffix used in the "1 h 23 min" route summary for longer routes. */
    hoursShort: string;
    /** Short meter suffix used in the route summary for sub-1km routes ("850 m"). */
    metersShort: string;
    /** Short kilometre suffix used in the route summary ("5.2 km"). */
    kmShort: string;
  };
  bookingSuccess: {
    headerStep: string;
    headerTitle: string;
    title: string;
    subtitle: string;
    bookingId: string;
    detailClub: string;
    detailZone: string;
    detailTime: string;
    detailTimeFallback: string;
    detailPackage: string;
    detailTotal: string;
    qrHint: string;
    actionDirection: string;
    actionShare: string;
    actionCalendar: string;
    homeBtn: string;
    /** Toast after the booking ID is copied to the clipboard. */
    copiedToast: string;
    /** A11y label on the copy-id icon button. */
    copyIdA11y: string;
    /** Title line at the top of the share-sheet message. */
    shareTitle: string;
    /** Toast when Direction is tapped but we don't have a club name. */
    directionMissingClub: string;
    /** Toast when Calendar is tapped but no start time is known. */
    calendarMissingTime: string;
    /** Prefix prepended to the calendar event title (e.g. "Nexora booking — Arena"). */
    calendarTitlePrefix: string;
  };
  timeSelect: {
    headerStep: string;
    headerTitle: string;
    title: string;
    tabPackages: string;
    tabHourly: string;
    pkgHourly: string;
    pkgHourlySub: string;
    pkg3Hour: string;
    pkg3HourSub: string;
    pkgNight: string;
    pkgNightSub: string;
    pkgPremium: string;
    pkgPremiumSub: string;
    timeLabel: string;
    todayLabel: string;
    continue: string;
    // BE-driven additions (packages + slots come from API now,
    // empty states + peak-hour badge need their own copy).
    hoursSuffix: string;
    noPackagesTitle: string;
    noPackagesSub: string;
    noSlotsSub: string;
    peakLabel: string;
    peakHint: string;
  };
  payment: {
    headerStep: string;
    headerTitle: string;
    title: string;
    summaryZone: string;
    summarySeat: string;
    summaryHourly: string;
    summaryTime: string;
    promoLabel: string;
    promoPlaceholder: string;
    promoApply: string;
    subtotal: string;
    serviceFee: string;
    total: string;
    methodLabel: string;
    methodClubBalance: string;
    methodClubBalanceSub: string;
    methodPayme: string;
    methodPaymeSub: string;
    methodClick: string;
    methodClickSub: string;
    /** Empty-state title when the user has no eligible payment method (balance + PSP options gated). */
    noMethodsTitle: string;
    /** Sub copy under the empty-state title. */
    noMethodsSub: string;
    confirmBtn: string;
    secure: string;
    errorSeatMissing: string;
    errorSeatUnavailable: string;
    errorSeatTaken: string;
    /** Inline warning when the club balance is below the total. */
    errorInsufficientBalance: string;
    /** Inline warning detail showing how much more the user needs to top up. */
    errorInsufficientBalanceDetail: string;
    /** Warning shown when the picked time slot rolled forward to tomorrow. */
    rolledToTomorrowWarning: string;
  };
  seatSelect: {
    headerStep: string;
    headerTitle: string;
    pickSeat: string;
    legendAvailable: string;
    legendTaken: string;
    legendSelected: string;
    rowLabel: string;
    screenLabel: string;
    selectedLabel: string;
    continue: string;
    takenToast: string;
    allTakenTitle: string;
    allTakenSub: string;
    // Shown when the BE returns no rows for the selected zone — the
    // operator hasn't built a layout for this zone yet (new club,
    // unconfigured PS5 lounge, etc.).
    noLayoutTitle: string;
    noLayoutSub: string;
    /** "soat" / "час" / "hour" — short form for "/hour" suffixes on prices. */
    perHourSuffix: string;
  };
  zoneSelect: {
    headerStep: string;
    headerTitle: string;
    title: string;
    subtitle: string;
    pcZone: string;
    pcZoneDesc: string;
    vipZone: string;
    vipZoneDesc: string;
    psZone: string;
    psZoneDesc: string;
    seatUnit: string;
    roomUnit: string;
    available: string;
    full: string;
    pricePerHour: string;
    /**
     * Shown in place of the hourly price when the BE has no per-zone
     * price configured for this tenant. Pre-fix the FE invented
     * 20k/35k/25k fallbacks, which surprised users at the till when
     * the operator's real rate differed. Audit finding #9.
     */
    priceAtClub: string;
    recommended: string;
    realtimeTitle: string;
    realtimeSub: string;
    emptyTitle: string;
    emptySub: string;
  };
  clubDetails: {
    reviewCount: string;
    open24h: string;
    open: string;
    closed: string;
    feature1: string;
    feature2: string;
    feature3: string;
    feature4: string;
    galleryTitle: string;
    galleryViewAll: string;
    /** "{current} / {total}" counter shown in the full-screen slider. */
    galleryCounter: string;
    /** Accessibility label for the slider's close button. */
    galleryCloseA11y: string;
    reviewsLink: string;
    direction: string;
    book: string;
    favoriteAdded: string;
    favoriteRemoved: string;
    /** A11y label for the heart button in ClubHero. */
    favoriteToggleA11y: string;
    /** A11y label for the share button in ClubHero. */
    shareA11y: string;
    /** Toast surfaced when Linking/Share refuses with a real error. */
    shareError: string;
    showMore: string;
    showLess: string;
    shareMessage: string;
    notFoundTitle: string;
    notFoundSub: string;
    notFoundBtn: string;
    /** Fallback shown in the address row when the BE returned no address. */
    addressUnknown: string;
    /** Shown while the discover-clubs list is still loading. */
    loading: string;
    /** Dialog title shown when user tries to book a club they haven't joined. */
    notJoinedTitle: string;
    /** Dialog message — explains they need to join first. */
    notJoinedMessage: string;
    /** Dialog confirm — proceeds to /club-join. */
    notJoinedConfirm: string;
    /** Toast surfaced while we switch tenant before opening zone-select. */
    switchingClubToast: string;
    /** Section title for the "Klub aksiyalari" card on club-details. */
    promotionsTitle: string;
    /** Empty-state copy when the current tenant has no active promotions. */
    promotionsEmpty: string;
  };
  walletTopup: {
    headerTitle: string;
    amountLabel: string;
    amountUnit: string;
    methodLabel: string;
    methodPayme: string;
    methodClick: string;
    methodFee: string;
    payBtn: string;
    secure: string;
    successToast: string;
    errorTitle: string;
    errorOpenUrl: string;
  };
  zoneSwitch: {
    headerTitle: string;
    currentLabel: string;
    standardBadge: string;
    extraTimeTitle: string;
    upgradeTitle: string;
    timeMin30: string;
    timeHour1: string;
    timeHour2: string;
    timeHour3: string;
    zoneVip: string;
    zoneVipSub: string;
    zonePremium: string;
    zonePremiumSub: string;
    continueBtn: string;
    footer: string;
  };
  bookings: {
    title: string;
    tabUpcoming: string;
    tabHistory: string;
    sectionUpcoming: string;
    sectionHistory: string;
    statusConfirmed: string;
    statusCompleted: string;
    download: string;
    durationHours: string;
    emptyTitle: string;
    emptySub: string;
    /** Cancel-booking CTA label on a confirmed row. */
    cancelBtn: string;
    /** Confirmation dialog title before cancelling. */
    cancelConfirmTitle: string;
    /** Confirmation dialog body — explains BE-side 1h-buffer policy. */
    cancelConfirmMessage: string;
    /** Destructive button label in the cancel-confirm dialog. */
    cancelConfirmBtn: string;
    /** Keep-booking button label in the cancel-confirm dialog. */
    cancelKeepBtn: string;
    /** Toast shown after a successful cancel. */
    cancelSuccess: string;
  };
  clubJoin: {
    headerTitle: string;
    title: string;
    subtitle: string;
    placeholder: string;
    qrAlt: string;
    helpTitle: string;
    helpText: string;
    joinBtn: string;
    errorEmpty: string;
    successToast: string;
    // ── Password fields (added with the per-club password fix) ──
    /** Label above the password input field. */
    passwordLabel: string;
    /** Placeholder inside the password input — "{n}" filled with min len. */
    passwordPlaceholder: string;
    /** Hint text under the password input — "{n}" filled with min len. */
    passwordHint: string;
    /** Toast when password is too short (FE pre-check). */
    errorPasswordTooShort: string;
    /** a11y label on the show-password toggle. */
    passwordShow: string;
    /** a11y label on the hide-password toggle. */
    passwordHide: string;
    /** Toast after QR scan auto-fills the code — prompts password entry. */
    scannedFillPasswordHint: string;
  };
  clubPreviewScreen: {
    headerTitle: string;
    joinBtn: string;
  };
  profileEdit: {
    headerTitle: string;
    changeAvatar: string;
    /** a11y hint for the avatar tap target — read by screen readers
     *  after the label, e.g. "Avatar, double-tap to change photo". */
    changeAvatarHint: string;
    firstName: string;
    lastName: string;
    login: string;
    phone: string;
    /** Placeholder shown in the empty phone field. Country-code
     *  example so the user knows what format to type. */
    phonePlaceholder: string;
    /** Subtext under the phone field explaining why we ask. */
    phoneHint: string;
    /** Toast when phone exceeds the 32-char column cap. */
    phoneTooLong: string;
    /** Toast when first/last name exceeds the 64-char BE cap. */
    nameTooLong: string;
    email: string;
    avatarUrlLabel: string;
    saveBtn: string;
    successToast: string;
    /** Hint shown under the avatar while the upload request is in flight. */
    avatarUploadingHint: string;
    /** Toast after the upload completes and the URL is set on the form. */
    avatarUploadedToast: string;
    /** Toast when the BE didn't return a usable URL (rare but defensive). */
    avatarUploadFailed: string;
    /** Toast when the OS gallery permission is declined. */
    galleryDenied: string;
    // ── Specific avatar-upload error toasts (BE validator failures
    //    pre-checked on the FE for instant feedback). ──
    /** File exceeds the 5 MB cap. Generic phrasing (no size shown). */
    avatarTooLarge: string;
    /** File exceeds 5 MB — `{size}` filled with the actual MB,
     *  `{max}` with the cap (5). */
    avatarTooLargeWithSize: string;
    /** Width/height outside the 64..2000 range — generic. */
    avatarBadDimensions: string;
    /** Image smaller than 64×64. `{min}` filled with 64. */
    avatarTooSmallWithDims: string;
    /** Image larger than 2000×2000. `{max}` filled with 2000. */
    avatarTooBigDimsWithDims: string;
    /** File mime not in jpg/jpeg/png/webp. Mentions HEIC needs conversion. */
    avatarBadFormat: string;
    /** Network failure during upload (no internet, timeout). */
    avatarNetworkError: string;
    /** Server-side failure (5xx, BE bug). */
    avatarServerError: string;
  };
  writeReview: {
    headerTitle: string;
    rateLabel: string;
    rate1: string;
    rate2: string;
    rate3: string;
    rate4: string;
    rate5: string;
    pickClub: string;
    commentLabel: string;
    commentPlaceholder: string;
    submitBtn: string;
    successToast: string;
    errorMissing: string;
    /**
     * Sub-rating row labels.
     *
     * The BE (SaveClubReviewAction) requires four sub-ratings:
     * atmosphere, cleanliness, technical, peripherals. Pre-fix the
     * FE collected three rows labelled atmosphere/cleanliness/staff
     * and sent `staff_rating` which the BE silently dropped, while
     * the missing `technical_rating` + `peripherals_rating` fell
     * back to the overall rating — so every submitted review had
     * three sub-rating columns set to the overall number and the
     * staff value the user picked never reached the database.
     * Audit finding H1.
     */
    atmosphereLabel: string;
    cleanlinessLabel: string;
    technicalLabel: string;
    peripheralsLabel: string;
  };
  myReviews: {
    /** Screen header — "Mening sharhlarim" / "Мои отзывы". */
    headerTitle: string;
    /** "{n} ta sharh yozdingiz" count subtitle. */
    countLabel: string;
    /** Empty-state title. */
    emptyTitle: string;
    /** Empty-state subtitle nudge. */
    emptySub: string;
    /** Sub-rating chip: technical (PCs / hardware). */
    technicalLabel: string;
    /** Sub-rating chip: peripherals (mouse / keyboard / headset). */
    peripheralsLabel: string;
    /** Fallback club name on rows where tenant info is missing. */
    unknownClub: string;
  };
  achievements: {
    headerTitle: string;
    tabBadges: string;
    tabCollected: string;
    tabStats: string;
    progress: string;
    earned: string;
    locked: string;
    statTotalScore: string;
    statTrophies: string;
    statWins: string;
    statRank: string;
    sectionFeatured: string;
    viewBtn: string;
    xpLabel: string;
    badgesSection: string;
    badgeCount: string;
    seasonRewards: string;
    seasonName: string;
    seasonEnds: string;
    badge1Title: string;
    badge1Sub: string;
    badge2Title: string;
    badge2Sub: string;
    badge3Title: string;
    badge3Sub: string;
    badge4Title: string;
    badge4Sub: string;
    badge5Title: string;
    badge5Sub: string;
    badge6Title: string;
    badge6Sub: string;
    /** Gating placeholder — title above the icon when the rewards backend isn't wired. */
    soonTitle: string;
    /** One-line explanation under the soon title. */
    soonSubtitle: string;
    /** "Coming soon" badge label. */
    soonBadge: string;
  };
  smartQueue: {
    headerTitle: string;
    title: string;
    subtitle: string;
    noQueueTitle: string;
    noQueueSub: string;
    activeTitle: string;
    yourPosition: string;
    estimatedWait: string;
    estimatedMinutes: string;
    pcCode: string;
    leaveBtn: string;
    joinBtn: string;
    minutes: string;
    successJoined: string;
    successLeft: string;
  };
  smartSeat: {
    headerTitle: string;
    title: string;
    subtitle: string;
    aiTag: string;
    reasonLabel: string;
    pcLabel: string;
    statusFree: string;
    holdBtn: string;
    successHeld: string;
  };
  teamFinder: {
    headerTitle: string;
    title: string;
    gameDropdown: string;
    skillDropdown: string;
    micToggle: string;
    sectionPlayers: string;
    sectionTeams: string;
    inviteBtn: string;
    joinBtn: string;
    createBtn: string;
    cancelBtn: string;
    emptyPlayers: string;
    invitePickerTitle: string;
    invitedToast: string;
    createdToast: string;
    noTeamHint: string;
    createSectionName: string;
    createPlaceholder: string;
    createHelperGame: string;
    statusOnline: string;
    statusInGame: string;
    statusOffline: string;
    // ── v2 additions (audit fixes) ──
    /** Section heading for the incoming-invites list — "{n}" filled. */
    invitesTitle: string;
    /** Accept button on a single invite card. */
    inviteAccept: string;
    /** Decline button on a single invite card. */
    inviteDecline: string;
    /** Toast after accepting — `{name}` filled with team name. */
    inviteAcceptedToast: string;
    /** Toast after declining. */
    inviteDeclinedToast: string;
    /** Fallback when an invite arrives with no team_name. */
    unknownTeam: string;
    /** Slots-label inside the invite card — `{n}` filled with members_max. */
    inviteSlotsLabel: string;
    /** Static hint shown in place of presence dot on `is_stub` rows. */
    stubHint: string;
    /** Title of the bottom-sheet game picker. */
    gameSheetTitle: string;
    /** "My teams" section heading on the Find tab. `{n}` filled. */
    myTeamsTitle: string;
  };
  clubReviewsList: {
    headerTitle: string;
    avgLabel: string;
    writeBtn: string;
    sectionRecent: string;
    /** Button label when the 1-per-month rule blocks a new submit; `{n}` = days remaining. */
    writeDisabledIn: string;
  };
  clubsSwitch: {
    headerTitle: string;
    sectionMine: string;
    activeBadge: string;
    addBtn: string;
    leaveConfirmTitle: string;
    leaveConfirmMessage: string;
    leaveBtn: string;
    cancelBtn: string;
    leftToast: string;
    activatedToast: string;
  };
  rewardsStore: {
    headerTitle: string;
    myPoints: string;
    points: string;
    tabAll: string;
    tabGames: string;
    tabFood: string;
    tabVip: string;
    tabPromos: string;
    historyBtn: string;
    cost: string;
    reward1Title: string;
    reward1Sub: string;
    reward2Title: string;
    reward2Sub: string;
    reward3Title: string;
    reward3Sub: string;
    reward4Title: string;
    reward4Sub: string;
    reward5Title: string;
    reward5Sub: string;
    reward6Title: string;
    reward6Sub: string;
  };
  notifications: {
    headerTitle: string;
    tabAll: string;
    tabBookings: string;
    tabTournaments: string;
    tabOffers: string;
    tabSystem: string;
    emptyTitle: string;
    emptySub: string;
    markAllRead: string;
    /** Header action: deletes every notification (with confirm dialog). */
    clearAll: string;
    /** A11y label for the trash icon in the header. */
    clearAllA11y: string;
    /** Confirm dialog — title shown above the destructive action. */
    clearAllConfirmTitle: string;
    /** Confirm dialog — supporting copy. */
    clearAllConfirmMessage: string;
    /** Confirm dialog — destructive button label. */
    clearAllConfirm: string;
    /** Confirm dialog — cancel button label. */
    clearAllCancel: string;
    /** Toast after a successful clear. */
    clearAllToast: string;
    timeMinutes: string;
    timeHours: string;
    /** Sub-minute relative-time label ("just now" / "только что"). */
    timeNow: string;
    /** A11y label for the header settings cog (gated coming-soon). */
    settingsA11y: string;
    n1Title: string;
    n1Desc: string;
    n1Time: string;
    n2Title: string;
    n2Desc: string;
    n2Time: string;
    n3Title: string;
    n3Desc: string;
    n3Time: string;
    n4Title: string;
    n4Desc: string;
    n4Time: string;
    n5Title: string;
    n5Desc: string;
    n5Time: string;
  };
  sessionInvites: {
    headerTitle: string;
    subtitle: string;
    emptyTitle: string;
    emptySub: string;
    inviteFromTitle: string;
    pcLabel: string;
    accept: string;
    reject: string;
    acceptedToast: string;
    rejectedToast: string;
  };
  bookingExit: {
    title: string;
    message: string;
    cancel: string;
    confirm: string;
  };
  walletScreen: {
    pickerTitle: string;
    pickerSub: string;
    noClubs: string;
    joinClubBtn: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyPickBtn: string;
    emptyJoinLink: string;
    clubLabel: string;
    balanceLabel: string;
    statCashback: string;
    statTodayCashback: string;
    cardsTitle: string;
    cardsAction: string;
    cardMain: string;
    quickTopup: string;
    topupBtn: string;
    pointsLabel: string;
    balanceShort: string;
    /** "Live" pill shown on the balance card to signal a real-time amount. */
    liveLabel: string;
    /** Bonus row sub-label on the balance card. */
    bonusLabel: string;
    /** Payment methods section title. */
    paymentMethodsTitle: string;
    /** A11y label for a single payment-method card. */
    paymentMethodA11y: string;
    /** Sub-label under Payme. */
    paymeSub: string;
    /** Sub-label under Click. */
    clickSub: string;
  };
  components: {
    breadcrumbZone: string;
    breadcrumbSeat: string;
    breadcrumbTime: string;
    breadcrumbPay: string;
    clubOpen: string;
    clubClosed: string;
    clubPsZones: string;
    club24h: string;
    clubVerified: string;
    /**
     * Fallback subtitle text used on club cards when none of the
     * usual signals (distance / PC count / PS-zone presence) are
     * available — typical for a newly-listed club that operators
     * haven't filled in catalog data for yet. Prevents card heights
     * from jumping between rows where the subtitle row would
     * otherwise be missing entirely.
     */
    clubSoonDetails: string;
    walletBalanceLabel: string;
    walletPointsLabel: string;
    membershipBalance: string;
    membershipTopup: string;
    countdownLabel: string;
    unitHours: string;
    unitMinutes: string;
    unitSeconds: string;
    qaBook: string;
    qaPs: string;
    qaTournaments: string;
    qaTopup: string;
    webMapTitle: string;
    webMapSub: string;
  };
  clubsList: {
    headerTitle: string;
    tabMine: string;
    tabAll: string;
    emptyTitle: string;
    emptySub: string;
    joinBtn: string;
  };
  promotionsList: {
    headerTitle: string;
    emptyTitle: string;
    emptySub: string;
  };
  rewardsCenter: {
    headerTitle: string;
    totalLabel: string;
    levelLabel: string;
    levelName: string;
    levelInfo: string;
    streakLabel: string;
    streakDays: string;
    streakSub: string;
    activeMissions: string;
    viewAll: string;
    recentAchievements: string;
    claimBtn: string;
    claimingBtn: string;
  };
  tournaments: {
    headerTitle: string;
    statusAll: string;
    statusLive: string;
    statusUpcoming: string;
    statusFinished: string;
    sectionFeatured: string;
    sectionUpcoming: string;
    liveBadge: string;
    registrationEndsIn: string;
    teamsCount: string;
    registerBtn: string;
    emptyList: string;
  };
  tournamentDetails: {
    headerTitle: string;
    liveBadge: string;
    prizeLabel: string;
    statRegistrationEnds: string;
    statStart: string;
    statTeams: string;
    statFormat: string;
    statServer: string;
    tabDetails: string;
    tabSchedule: string;
    tabParticipants: string;
    tabRules: string;
    aboutTitle: string;
    aboutDesc: string;
    prizesTitle: string;
    prize1: string;
    prize2: string;
    prize3: string;
    prize4: string;
    registerBtn: string;
    registeredBtn: string;
    waitlistBtn: string;
    toastRegistered: string;
    toastWaitlist: string;
    notFound: string;
    teamsRegistered: string;
    /** A11y label for the header share button. */
    shareA11y: string;
    /** Placeholder text when the Schedule tab is selected but the BE bracket isn't wired yet. */
    scheduleSoon: string;
    /** Placeholder text when the Participants tab is selected but the BE list isn't wired yet. */
    participantsSoon: string;
  };
  friends: {
    headerTitle: string;
    tabMine: string;
    tabSearch: string;
    sectionMine: string;
    pendingTitle: string;
    pendingSub: string;
    searchPlaceholder: string;
    searchEmptyTitle: string;
    searchEmptySub: string;
    foundCount: string;
    addBtn: string;
    removeBtn: string;
    emptyTitle: string;
    emptySub: string;
    sentToast: string;
    removedToast: string;
    // ── v2 additions (audit fixes) ──
    /** "Type to search" empty state title before any search. */
    searchPromptTitle: string;
    /** Subtitle under the search-prompt title. */
    searchPromptSub: string;
    /** Section title for outgoing pending requests — "{n}" filled. */
    outgoingTitle: string;
    /** Action label for cancelling an outgoing request. */
    cancelBtn: string;
    /** Toast after cancelling an outgoing request. */
    cancelledToast: string;
    /** Confirmation dialog title for unfriending. */
    removeConfirmTitle: string;
    /** Confirmation dialog message — `{name}` filled. */
    removeConfirmMessage: string;
    /** Confirmation dialog primary (destructive) button. */
    removeConfirmYes: string;
    /** Confirmation dialog cancel button. */
    removeConfirmNo: string;
    /** Search-result pill shown when the row is already a friend. */
    alreadyFriendsBadge: string;
    /** Search-result pill shown when the row is blocked. */
    blockedBadge: string;
  };
  friendRequests: {
    headerTitle: string;
    subtitle: string;
    emptyTitle: string;
    emptySub: string;
    accept: string;
    reject: string;
    acceptedToast: string;
    rejectedToast: string;
  };
  favorites: {
    headerTitle: string;
    headerAction: string;
    sectionFav: string;
    sectionRebook: string;
    rebookBtn: string;
    lastBooked: string;
    metaPc: string;
    metaPs: string;
    /** Empty-state title shown when the favourites list is empty. */
    emptyTitle: string;
    /** Empty-state sub-copy under the title. */
    emptySub: string;
    /** Empty-state CTA — opens /discover. */
    discoverBtn: string;
    // ── v2 additions (singleton refactor + polish) ──
    /** Count label under the header: "N ta saqlangan" / "N saved". */
    countLabel: string;
    /** Toast after a single unfavorite. `{name}` filled with the club. */
    removedToast: string;
    /** Header pill — opens the "Clear all" confirm dialog. */
    clearAllAction: string;
    /** Confirm dialog title for clearing all favorites. */
    clearAllTitle: string;
    /** Confirm dialog message — `{n}` filled with the count. */
    clearAllMessage: string;
    /** Confirm dialog primary button (destructive). */
    clearAllConfirm: string;
    /** Confirm dialog secondary button. */
    clearAllCancel: string;
    /** Toast after the user confirms "Clear all". */
    clearedToast: string;
    /** Display fallback when a club row has no name (rare). */
    fallbackName: string;
  };
  aiAssistant: {
    name: string;
    role: string;
    greeting: string;
    sectionTips: string;
    sectionHelp: string;
    tip1: string;
    tip2: string;
    tip3: string;
    chip1: string;
    chip2: string;
    chip3: string;
    chip4: string;
    inputPlaceholder: string;
  };
  helpSupport: {
    headerTitle: string;
    aiTitle: string;
    aiSubtitle: string;
    searchPlaceholder: string;
    quickActions: string;
    actionChat: string;
    actionChatSub: string;
    actionCall: string;
    actionCallSub: string;
    actionSubmit: string;
    actionSubmitSub: string;
    actionRemote: string;
    actionRemoteSub: string;
    popularTopics: string;
    /**
     * Legacy hardcoded placeholders, kept around so other surfaces
     * that may still reference them don't crash. Pre-fix the help
     * screen showed three static topic labels here and tapping any of
     * them just opened the ticket-submit modal — so users could
     * neither read an answer nor distinguish between topics. The
     * screen now calls `/mobile/help/topics` which returns 8 real
     * question + answer pairs in the active locale.
     */
    topic1: string;
    topic2: string;
    topic3: string;
    viewAll: string;
    /** Empty-state copy shown when the BE FAQ list is empty / 404s. */
    topicsEmpty: string;
    /** Loading state while the FAQ list is in flight. */
    topicsLoading: string;
    /** "Didn't find what you needed?" CTA above the contact actions. */
    stillNeedHelp: string;
    ticketSubtitle: string;
    ticketSubject: string;
    ticketSubjectPlaceholder: string;
    ticketMessage: string;
    ticketMessagePlaceholder: string;
    ticketSendBtn: string;
    ticketSuccess: string;
    ticketErrorEmpty: string;
  };
  teamChat: {
    tabChat: string;
    tabMembers: string;
    tabSettings: string;
    voiceLabel: string;
    voiceLobby: string;
    joinVoice: string;
    joinedVoice: string;
    inputPlaceholder: string;
    me: string;
    emptyChat: string;
    /** Placeholder text shown when the Members tab is selected but the BE list isn't wired. */
    membersSoon: string;
    /** Placeholder text shown when the Settings tab is selected but the BE mutation isn't wired. */
    settingsSoon: string;
    // ── v2 additions ──
    /** "(siz)" / "(вы)" suffix on the current-user member row. */
    you: string;
    /** Captain / Owner badge on the team's owner row. */
    roleOwner: string;
    /** Invited badge on a member who hasn't accepted yet. */
    roleInvited: string;
    /** Empty-state copy in the Members tab when the BE returns nothing. */
    membersEmpty: string;
    /** a11y label on the "..." header menu button. */
    menuA11y: string;
    /** Action-sheet row: leave the team (member-only). */
    leaveAction: string;
    /** Action-sheet row: disband the team (owner-only). */
    disbandAction: string;
    /** Confirm dialog title for leaving. */
    leaveConfirmTitle: string;
    /** Confirm dialog message for leaving. */
    leaveConfirmMessage: string;
    /** Confirm dialog primary button for leaving. */
    leaveConfirmYes: string;
    /** Confirm dialog cancel button for leaving. */
    leaveConfirmNo: string;
    /** Toast after leaving. */
    leftToast: string;
    /** Confirm dialog title for disbanding. */
    disbandConfirmTitle: string;
    /** Confirm dialog message for disbanding. */
    disbandConfirmMessage: string;
    /** Confirm dialog primary button for disbanding. */
    disbandConfirmYes: string;
    /** Confirm dialog cancel button for disbanding. */
    disbandConfirmNo: string;
    /** Toast after disbanding. */
    disbandedToast: string;
  };
  partyBooking: {
    headerTitle: string;
    title: string;
    subtitle: string;
    step1: string;
    step2: string;
    noFreeSeats: string;
    noFriends: string;
    findFriends: string;
    bookCta: string;
    errorTitle: string;
    errorMin1Pc: string;
    successTitle: string;
    successMessage: string;
    partialInvitesMessage: string;
  };
  smartRec: {
    headerTitle: string;
    title: string;
    aiTag: string;
    bestClubs: string;
    bestZones: string;
    bestTimes: string;
    viewAll: string;
    today: string;
    zonePs: string;
    zonePsMeta: string;
    zoneVip: string;
    zoneVipMeta: string;
    zoneVr: string;
    zoneVrMeta: string;
    timeGoodLoad: string;
    timeMostPopular: string;
    timeLowLoad: string;
    emptyClubs: string;
  };
  rating: {
    headerTitle: string;
    scopeGlobal: string;
    scopeRegion: string;
    scopeFriends: string;
    filterTop: string;
    filterSeason: string;
    columnPlayer: string;
    columnRating: string;
    you: string;
    footer: string;
  };
  referEarn: {
    headerTitle: string;
    title: string;
    codeLabel: string;
    linkLabel: string;
    howItWorks: string;
    step1: string;
    step2: string;
    step3: string;
    yourReferrals: string;
    statInvites: string;
    statActive: string;
    statPoints: string;
    milestones: string;
    milestone5: string;
    milestone10: string;
    milestone20: string;
    received: string;
    /** Template for milestone label — `{n}` replaced with target count. */
    milestoneTemplate: string;
    /** Toast after the user successfully copies their referral code. */
    copiedToast: string;
    /** Message body for the native share sheet (URL appended on a new line). */
    shareMessage: string;
    /** Accessibility label for the copy-code button. */
    copyCodeA11y: string;
    /** Accessibility label for the share-link button. */
    shareLinkA11y: string;
  };
  statistics: {
    headerTitle: string;
    title: string;
    proBadge: string;
    levelLabel: string;
    overall: string;
    viewAll: string;
    statHours: string;
    statSessions: string;
    statFavoriteClubs: string;
    statTotalSpent: string;
    statFavoriteGames: string;
    statAvgRating: string;
    valueHours: string;
    valueSessions: string;
    valueClubs: string;
    aiInsight: string;
    insightLine1: string;
    insightLine2: string;
  };
  onboarding: {
    skip: string;
    page1Tagline1: string;
    page1Tagline2: string;
    page1Footer1: string;
    page1Footer2: string;
    page2TitlePart1: string;
    page2TitleAccent: string;
    page2TitlePart2: string;
    page2Subtitle: string;
    page3TitlePart1: string;
    page3TitleAccent1: string;
    page3TitleAccent2: string;
    page3Subtitle: string;
    page3Feat1Title: string;
    page3Feat1Sub: string;
    page3Feat2Title: string;
    page3Feat2Sub: string;
    page3Feat3Title: string;
    page3Feat3Sub: string;
  };
  services: {
    headerTitle: string;
    yourSession: string;
    activeBadge: string;
    balanceLabel: string;
    sectionTitle: string;
    staffTitle: string;
    staffSub: string;
    issueTitle: string;
    issueSub: string;
    supportTitle: string;
    supportSub: string;
    /** Default message sent with `callStaff` if the user taps "Call staff". */
    staffDefaultMsg: string;
    /** Default message sent with `reportIssue({type:tech})`. */
    issueDefaultMsg: string;
    /** Toast after a staff call is sent successfully. */
    staffSentToast: string;
    /** Toast after a tech issue is reported successfully. */
    issueSentToast: string;
  };
  qrScan: {
    headerTitle: string;
    subtitle: string;
    orCode: string;
    actionFlash: string;
    actionGallery: string;
    guide: string;
    /** Toast when the typed/scanned code doesn't match `<pc_id>:<code>` or the URL form. */
    invalidFormat: string;
    /** Big CTA above the static QR — launches the live camera scanner. */
    scanCta: string;
    /** Title shown in the permission gate inside the scanner modal. */
    cameraPermTitle: string;
    /** Subtitle / explanation under the permission gate. */
    cameraPermSub: string;
    /** Button on the permission gate that asks the OS again. */
    cameraPermCta: string;
    /** Toast when the user declines the camera prompt. */
    cameraDenied: string;
    /** Toast when the user declines the gallery prompt. */
    galleryDenied: string;
    /** Toast when an image was picked but no QR could be decoded. */
    galleryDecodeFailed: string;
    /** Toast when the picker returned an empty/missing URI (rare Android edge case). */
    galleryPickFailed: string;
    /** Hint text shown under the scanner viewfinder. */
    alignHint: string;
    // ─── v2 redesign additions ───
    /** Title shown inside the empty viewfinder frame. */
    viewfinderTitle: string;
    /** Sub-hint under the viewfinder frame. */
    viewfinderSub: string;
    /** a11y hint on the tappable viewfinder ("double-tap to open camera"). */
    viewfinderHint: string;
    /** Secondary "pick from gallery" CTA — bypasses the scanner modal. */
    galleryCta: string;
    /** Loading label shown while the gallery picker is open. */
    galleryPicking: string;
    /** "OR" divider between scan path and manual path. */
    orDivider: string;
    /** Toggle row that expands the manual code entry section. */
    manualToggle: string;
    /** Hint text inside the manual section. */
    manualHint: string;
    /** Placeholder for the manual code input. */
    manualPlaceholder: string;
    /** Button under the manual code input. */
    manualSubmit: string;
    /** Help step 1 (Sit at any PC in your club). */
    helpStep1: string;
    /** Help step 2 (Find the QR sticker on the monitor / case). */
    helpStep2: string;
    /** Help step 3 (Tap "Scan with camera" and frame the sticker). */
    helpStep3: string;
    /** Overlay text shown over the camera while the BE call from a scan is in flight. */
    submittingHint: string;
    /** Title of the no-tenant gate card. */
    noTenantTitle: string;
    /** Body of the gate when the user has clubs but none active. */
    noTenantHasClubs: string;
    /** Body of the gate when the user hasn't joined any club. */
    noTenantNoClubs: string;
    /** Toast when user taps scan/gallery without an active tenant. */
    noTenantToast: string;
    /** CTA on the gate when clubs exist but none active. */
    pickClubBtn: string;
    /** CTA on the gate when no clubs at all. */
    joinClubBtn: string;
  };
  activeSession: {
    headerTitle: string;
    pcLabel: string;
    zoneBadge: string;
    startTime: string;
    elapsed: string;
    balanceLabel: string;
    quickActions: string;
    extend: string;
    addBalance: string;
    switchZone: string;
    endSession: string;
    tabSession: string;
    tabServices: string;
    tabChat: string;
    tabSettings: string;
    open: string;
    /** Title shown when no PC was matched to the user after polling. */
    awaitingTitle: string;
    /** Sub-text under awaitingTitle — explains the next action. */
    awaitingSub: string;
    /** Title shown when reservation is confirmed but session hasn't started. */
    pendingTitle: string;
    /** Sub-text under pendingTitle — clarifies the booked-but-not-busy state. */
    pendingSub: string;
  };
  /**
   * Transaction history screen — reachable from Settings → History.
   * Lists every wallet transaction (topup, cashback, package buy,
   * subscription, rank bonus, mission bonus, charge, refund) newest
   * first. Pre-fix the Settings row routed to /(tabs)/bookings, so
   * the user landed on the reservation list instead of their actual
   * money-in-and-out log.
   */
  transactionHistory: {
    headerTitle: string;
    /** Filter chip labels. */
    filterAll: string;
    filterTopups: string;
    filterBonuses: string;
    filterCharges: string;
    /** Empty-state title shown when listTransactions returns []. */
    emptyTitle: string;
    /** Empty-state subtitle. */
    emptySub: string;
    /** Sub-row labels per known transaction type. */
    typeTopup: string;
    typeBonus: string;
    typePackage: string;
    typeSubscription: string;
    typeTierBonus: string;
    typeMissionBonus: string;
    typeCharge: string;
    typeRefund: string;
    /** Fallback row label when BE returns an unrecognised type. */
    typeOther: string;
    /** Top-up CTA shown on the empty state, deep-links to /wallet-topup. */
    topupCta: string;
  };
  /**
   * Notification settings screen — reachable from Settings →
   * "Bildirishnoma sozlamalari". Local-only preferences (AsyncStorage)
   * for per-category push delivery. BE push pipeline is "soon", so the
   * toggles are remembered for when delivery actually wires up; in
   * the meantime they suppress the bell badge for muted categories
   * without affecting the inbox list itself.
   */
  notificationSettings: {
    headerTitle: string;
    /** Banner explaining the local-only state. */
    soonBannerTitle: string;
    soonBannerSub: string;
    /** Section: per-category toggles. */
    categoriesSection: string;
    catBookings: string;
    catBookingsSub: string;
    catTournaments: string;
    catTournamentsSub: string;
    catOffers: string;
    catOffersSub: string;
    catSystem: string;
    catSystemSub: string;
    /** Footer link to view the inbox itself. */
    viewInboxLabel: string;
    viewInboxSub: string;
  };
  profile: {
    guestName: string;
    greeting: string;
    levelBadge: string;
    statTotalScore: string;
    statGames: string;
    favoriteGames: string;
    viewAll: string;
    quickLinks: string;
    quickBook: string;
    quickTournaments: string;
    quickWallet: string;
    quickRewards: string;
    loyaltyTitle: string;
    loyaltySub: string;
    loyaltyBtn: string;
    /** Loyalty-card CTA label while the rewards backend is gated. */
    loyaltyBtnSoon: string;
    hours: string;
    soon: string;
    /** Section heading above the upcoming-features block (below Settings). */
    soonSection: string;
    /** Subtitle under the section heading — explains the section is
     *  the feature pipeline ("upcoming features", "being built", etc.). */
    soonSubtitle: string;
    /** a11y hint when the "Tez orada" section is collapsed (tap to expand). */
    soonExpandHint: string;
    /** a11y hint when the "Tez orada" section is expanded (tap to collapse). */
    soonCollapseHint: string;
    menu: {
      ai: string;
      aiTips: string;
      rewardsCenter: string;
      rewardsShop: string;
      referEarn: string;
      stats: string;
      favorites: string;
      teams: string;
      friends: string;
      friendRequests: string;
      sessionInvites: string;
      myClubs: string;
      joinClub: string;
      reviews: string;
      smartSeat: string;
      smartQueue: string;
      partyBooking: string;
      rating: string;
      qrScan: string;
      help: string;
      settings: string;
    };
  };
};

export const translations: Record<Locale, Dict> = {
  uz: {
    common: {
      currencyUnit: "so'm",
      error: 'Xatolik',
      ok: 'OK',
      retry: 'Qayta urinish',
      cancel: 'Bekor qilish',
      confirm: 'Tasdiqlash',
      loading: 'Yuklanmoqda...',
      comingSoon: 'Tez orada',
      permission: {
        locationTitle: 'Joylashuv ruxsati',
        locationMessage:
          "Yaqin atrofdagi klublarni xaritada ko'rsatish va eng yaqin Nexora joyini topish uchun joylashuvga ruxsat bering. Ma'lumot faqat lokatsiya so'rovida ishlatiladi.",
        cameraTitle: 'Kamera ruxsati',
        cameraMessage:
          "PC monitoridagi QR kodni skanerlash uchun kamera kerak. Suratlar saqlanmaydi.",
        notificationsTitle: 'Bildirishnoma ruxsati',
        notificationsMessage:
          "Bron tasdig'i, navbat holati va aksiyalar haqida xabardor qilamiz. Spam yo'q.",
        allow: 'Ruxsat berish',
        notNow: 'Hozir emas',
        openSettings: 'Sozlamalarni ochish',
        deniedTitle: 'Ruxsat berilmadi',
        deniedMessage:
          "Sozlamalar orqali ruxsat berishingiz mumkin. Tizim sozlamalariga o'tasizmi?",
      },
    },
    tabs: {
      home: 'Bosh sahifa',
      discover: 'Kashf qilish',
      bookings: 'Bronlarim',
      wallet: 'Hamyon',
      profile: 'Profil',
      scanQr: 'Skanerlash',
      scanQrA11y: 'PC QR-kodini skanerlash',
    },
    soon: {
      aiAssistant: {
        title: 'AI yordamchi tez orada',
        subtitle: "Sun'iy intellekt sizga klub, vaqt va o'yin bo'yicha shaxsiy tavsiyalar beradi.",
      },
      aiRecommendations: {
        title: 'AI tavsiyalar tez orada',
        subtitle: "AI sizning o'yin tarixingiz asosida eng yaxshi klub va vaqtni topadi.",
      },
      smartSeat: {
        title: 'Smart Seat tez orada',
        subtitle: "AI eng yaxshi bo'sh PC ni o'zi tanlab beradi — siz faqat tasdiqlaysiz.",
      },
      smartQueue: {
        title: 'Smart Navbat tez orada',
        subtitle: "PC bo'shashini kutmasdan navbatga turing — bo'shaganda darhol xabar olasiz.",
      },
      walletTopup: {
        title: "To'ldirish tez orada",
        subtitle: "Payme va Click orqali balansni to'ldirish hozircha klubda amalga oshiriladi. Tez orada to'g'ridan-to'g'ri ilovadan ham mumkin bo'ladi.",
      },
      sessionInvites: {
        title: 'Sessiya takliflari tez orada',
        subtitle: "Do'stlaringizni shu zahoti o'yin sessiyangizga taklif qila olasiz.",
      },
      partyBooking: {
        title: "Birga o'ynash tez orada",
        subtitle: "Bir nechta do'st bilan bir vaqtda bron qilish va birga o'ynash.",
      },
      rating: {
        title: 'Reyting tez orada',
        subtitle: "O'yin natijalarini real-time ko'rib boring va eng yaxshi o'yinchilar ro'yxatida ishtirok eting.",
      },
      tournaments: {
        title: 'Turnirlar tez orada',
        subtitle: "Sovrinli turnirlar, jonli efir, jamoaviy o'yinlar — barchasi yo'lda.",
      },
      bonusPoints: {
        title: 'Bonus ballar tez orada',
        subtitle: "Har bir sessiya uchun bonus ballari, missiyalar va mukofotlar tizimi tayyorlanmoqda.",
      },
      referEarn: {
        title: "Do'st taklif tez orada",
        subtitle: "Do'stlaringizni taklif qilib bonus ballar to'plash imkoniyati mukofotlar tizimi bilan birga ishga tushadi.",
      },
      statistics: {
        title: 'Statistika tez orada',
        subtitle: "Sessiyalar, sarflangan vaqt, sevimli o'yinlaringiz va boshqa shaxsiy statistika ko'rsatkichlari tayyorlanmoqda.",
      },
      badgeShort: 'Tez orada',
    },
    settings: {
      title: 'Sozlamalar',
      account: { title: 'Hisob va profil', subtitle: "Shaxsiy ma'lumotlar, avatar, daraja" },
      preferences: { title: 'Afzalliklar', subtitle: "O'yinlar, klublar, til va boshqa" },
      privacy: { title: 'Maxfiylik va xavfsizlik', subtitle: 'Parol, 2FA, maxfiylik sozlamalari' },
      payment: { title: "To'lov usullari", subtitle: "Karta va boshqa to'lov usullari" },
      history: { title: 'Bitim tarixi', subtitle: "To'lovlar va kvitansiyalar" },
      notifications: { title: 'Bildirishnoma sozlamalari', subtitle: 'Bildirishnomalar va eslatmalar' },
      language: 'Til',
      about: 'Ilova haqida',
      versionPrefix: 'Versiya',
      comingSoon: "Bu bo'lim hozircha tayyor emas",
      logout: 'Hisobdan chiqish',
      logoutTitle: 'Chiqish',
      logoutMessage: 'Haqiqatan ham hisobdan chiqmoqchimisiz?',
      cancel: 'Bekor qilish',
      confirmLogout: 'Chiqish',
    },
    language: {
      title: 'Tilni tanlang',
      subtitle: 'Ilova interfeysi tili',
    },
    login: {
      titleLine1: 'Qaytganingizdan',
      titleLine2: 'xursandmiz!',
      subtitle: "Davom etish uchun tizimga kiring\nyoki ro'yxatdan o'ting.",
      tabs: { signin: 'Kirish', signup: "Ro'yxatdan o'tish" },
      loginPlaceholder: 'Login (masalan: akmal)',
      passwordPlaceholder: 'Parol',
      passwordConfirmPlaceholder: 'Parolni qayta kiriting',
      showPasswordA11y: "Parolni ko'rsatish",
      hidePasswordA11y: 'Parolni yashirish',
      continue: 'Kirish',
      signupBtn: "Ro'yxatdan o'tish",
      divider: 'yoki davom eting',
      noAccount: "Hisobingiz yo'qmi? ",
      haveAccount: 'Hisobingiz bormi? ',
      signupLink: "Ro'yxatdan o'tish",
      signinLink: 'Kirish',
      errorLogin: "Login 3-64 ta belgi (faqat harf, raqam, _-.)",
      errorPassword: 'Parol kamida 3 ta belgidan iborat',
      errorPasswordMismatch: 'Parollar mos kelmadi',
      welcomeToast: 'Xush kelibsiz!',
      registeredToast: "Ro'yxatdan o'tdingiz!",
      socialSoonToast: "Bu xizmat tez orada qo'shiladi",
      checkingLabel: 'Tekshirilmoqda...',
    },
    home: {
      greetingMorning: 'Xayrli tong',
      greetingDay: 'Xayrli kun',
      greetingEvening: 'Xayrli kech',
      greetingNight: 'Tungi salom',
      level: 'Daraja',
      levelDefault: 'Yangi',
      clubsTabs: { mine: 'Mening klublarim', all: 'Boshqa klublar' },
      viewAll: "Barchasini ko'rish",
      viewAllRemaining: 'Yana {n} ta',
      promotionsTitle: 'Faol aksiyalar',
      emptyTitle: "Hali bironta klubga qo'shilmagansiz",
      emptySub: "Barcha klublardan tanlab a'zo bo'lib chiqing yoki kod orqali qo'shiling.",
      emptyBtn: "Klubga qo'shilish",
      emptyBrowseAllLink: "Barcha klublarni ko'rish",
      allEmptyTitle: "Klublar topilmadi",
      allEmptySub: "Hozircha hech qaysi klub mavjud emas. Keyinroq qaytib keling.",
      otherEmptyTitle: "Hammasiga qo'shilgansiz",
      otherEmptySub: "Yangi klub topish uchun Kashf qilish bo'limiga o'ting.",
      otherEmptyBtn: "Kashf qilish",
      promoEmptyTitle: "Hozircha aktiv aksiya yo'q",
      promoEmptySub: "Klub yangi aksiyalar e'lon qilganda shu yerda ko'rinadi.",
      promoEmptyReload: 'Yangilash',
      promoBonusPercent: '+{n}% bonus',
      promoUntil: '{date} gacha',
      aiTitle: 'Nexora AI yordamchisi',
      aiBeta: 'Beta',
      aiDescription: 'Akmal, sizga 3 ta klubni tavsiya qilamiz.',
      aiAction: "Tavsiyalarni ko'rish",
      guestName: 'Mehmon',
      openProfileA11y: 'Profilni ochish',
      bellA11y: 'Bildirishnomalar',
      bellWithUnreadA11y: "{n} ta yangi bildirishnoma — ochish",
    },
    discover: {
      cityTashkent: 'Toshkent shahri',
      searchPlaceholder: "Klub yoki tuman bo'yicha qidirish",
      filters: {
        all: 'Barchasi',
        pc: 'PC',
        ps: 'PS zona',
        open: 'Ochiq hozir',
        more: 'Filtr',
      },
      view: { map: 'Xarita', list: "Ro'yxat" },
      book: 'Bron qilish',
      direction: "Yo'nalish",
      open24h: 'Ochiq · 24 soat',
      open: 'Ochiq',
      closed: 'Yopiq',
      emptyTitle: 'Hech narsa topilmadi',
      emptySub: "Filtrni o'zgartiring yoki keyinroq urinib ko'ring.",
      citySheetTitle: 'Shaharni tanlang',
      filterSheetTitle: 'Qo\'shimcha filtrlar',
      filterRating: 'Reyting',
      filterDistance: 'Masofa',
      filterReset: 'Tozalash',
      filterApply: 'Qo\'llash',
      soonBadge: 'Tez orada',
      gpsDeniedTitle: 'Joylashuv yoqilmagan',
      gpsDeniedSub: 'Yaqin klublarni ko\'rish uchun bosing',
      resultsCount: '{n} ta klub topildi',
      clearFilters: 'Filtrlarni tozalash',
      swipeHint: 'Klublarni chap/o\'ng surib ko\'ring',
      directionsShow: "Yo'l ko'rsatish",
      directionsHide: "Yo'lni yashirish",
      directionsLoading: 'Hisoblanmoqda…',
      directionsNeedGps: 'Avval joylashuvni yoqing',
      directionsErrorRoute: "Yo'l hisoblab bo'lmadi, qayta urinib ko'ring",
      directionsApprox: "Taxminiy yo'l ko'rsatildi",
      directionsApproxHint: "Taxminiy — to'g'ri chiziq bo'yicha",
      directionsFromYou: 'Sizdan {club}gacha',
      recenterA11y: 'Joylashuvga qaytish',
      zoomInA11y: 'Yaqinroq ko\'rish',
      zoomOutA11y: 'Uzoqroq ko\'rish',
      minutesShort: 'min',
      hoursShort: 'soat',
      metersShort: 'm',
      kmShort: 'km',
    },
    bookingSuccess: {
      headerStep: '06',
      headerTitle: 'BRON TASDIQLANDI',
      title: 'Bron muvaffaqiyatli!',
      subtitle: "O'rningiz band qilindi — klubga kelganingizda QR kodni ko'rsating.",
      bookingId: 'Bron ID',
      detailClub: 'Klub',
      detailTimeFallback: "Bugun, vaqt belgilanmagan",
      detailZone: "Zona / O'rin",
      detailTime: 'Sana va vaqt',
      detailPackage: 'Paket',
      detailTotal: 'Jami',
      qrHint: "QR kodni klubda ko'rsating",
      actionDirection: "Yo'lni ko'rish",
      actionShare: 'Ulashish',
      actionCalendar: 'Kalendar',
      homeBtn: 'Bosh sahifa',
      copiedToast: 'Bron ID nusxalandi',
      copyIdA11y: 'Bron IDni nusxalash',
      shareTitle: 'Nexora bronim:',
      directionMissingClub: "Klub ma'lumotlari topilmadi",
      calendarMissingTime: 'Vaqt belgilanmagan',
      calendarTitlePrefix: 'Nexora bron —',
    },
    timeSelect: {
      headerStep: '04',
      headerTitle: 'VAQT VA PAKET',
      title: 'Vaqt va paketni tanlang',
      tabPackages: 'Paketlar',
      tabHourly: 'Soatlik',
      pkgHourly: 'Soatlik',
      pkgHourlySub: '1 soat',
      pkg3Hour: '3 soatlik paket',
      pkg3HourSub: '3 soat',
      pkgNight: 'Tungi paket',
      pkgNightSub: '22:00 - 08:00',
      pkgPremium: 'Premium kunlik pass',
      pkgPremiumSub: "Cheksiz o'yin kuni bo'yi",
      timeLabel: 'Vaqtni tanlang',
      todayLabel: 'Bugun, 12 may',
      continue: 'Davom etish',
      hoursSuffix: 'soat',
      noPackagesTitle: 'Paketlar mavjud emas',
      noPackagesSub: 'Ushbu klubda hali paketlar sozlanmagan. Soatlik bron qiling.',
      noSlotsSub: "Bu kunda bo'sh vaqt yo'q. Ertaga qaytib ko'ring.",
      peakLabel: 'Yuqori talab',
      peakHint: "Bu vaqt yuqori talab vaqti. Paket narxi o'zgarmaydi, lekin klub band bo'lishi mumkin.",
    },
    payment: {
      headerStep: '05',
      headerTitle: "TO'LOV",
      title: 'Buyurtmani tekshiring',
      summaryZone: 'Kompyuter zonasi',
      summarySeat: "{seat} o'rin",
      summaryHourly: 'Soatlik',
      summaryTime: '12 may, 12:00 - 13:00',
      promoLabel: 'Promo kod',
      promoPlaceholder: 'Kod kiriting',
      promoApply: "Qo'llash",
      subtotal: 'Subtotal',
      serviceFee: 'Xizmat haqi',
      total: 'Jami',
      methodLabel: "To'lov usuli",
      methodClubBalance: 'Klubdagi balans',
      methodClubBalanceSub: '{name} · {balance}',
      methodPayme: 'Payme',
      methodPaymeSub: 'Mobil to\'lov',
      methodClick: 'Click',
      methodClickSub: 'Mobil to\'lov',
      noMethodsTitle: "Balans yetarli emas",
      noMethodsSub: "Hozircha ilova orqali to'ldirish mavjud emas. Iltimos, klubdagi kassada balansingizni to'ldiring.",
      confirmBtn: "To'lovni tasdiqlash",
      secure: "To'lovingiz xavfsiz va himoyalangan",
      errorSeatMissing: "Avval o'rin tanlang",
      errorSeatUnavailable: "Tanlangan o'rin topilmadi. Iltimos qayta tanlang.",
      errorSeatTaken: "Bu o'rin endi band. Iltimos boshqasini tanlang.",
      errorInsufficientBalance: "Balansda yetarli mablag' yo'q",
      errorInsufficientBalanceDetail: "Yana {amount} {unit} kerak. Klubda to'ldiring.",
      rolledToTomorrowWarning: "Tanlangan vaqt o'tib ketgan — ertangi kunga {time} bron qilinadi.",
    },
    seatSelect: {
      headerStep: '03',
      headerTitle: "O'RIN TANLASH",
      pickSeat: "O'zingizga o'rin tanlang",
      legendAvailable: 'Mavjud',
      legendTaken: 'Band',
      legendSelected: 'Tanlangan',
      rowLabel: '{letter} qator',
      screenLabel: 'EKRAN',
      selectedLabel: 'Tanlangan: ',
      continue: 'Davom etish',
      takenToast: 'Bu joy band',
      perHourSuffix: 'soat',
      allTakenTitle: "Barcha o'rinlar band",
      allTakenSub: 'Hozircha bo\'sh joy yo\'q. Boshqa zonani sinab ko\'ring.',
      noLayoutTitle: "O'rinlar joylashuvi sozlanmagan",
      noLayoutSub: "Bu klubda hali zona joylashuvi yo'q. Operator bilan bog'laning.",
    },
    zoneSelect: {
      headerStep: '02',
      headerTitle: 'ZONANI TANLASH',
      title: 'Zona tanlang',
      subtitle: "O'zingizga mos zonani tanlang",
      pcZone: 'Kompyuter zonasi',
      pcZoneDesc: "Yuqori samaradorlikli PC'lar va qulay kreslolar",
      vipZone: 'VIP kompyuterlar',
      vipZoneDesc: 'Raqobatchilar uchun premium jihozlar',
      psZone: 'PS5 xonalari',
      psZoneDesc: 'PS5 konsollar va katta ekranlar',
      seatUnit: 'joy',
      roomUnit: 'zona',
      available: '{n} {unit} mavjud',
      full: "Bo'sh joy yo'q",
      pricePerHour: 'soatiga {price}',
      priceAtClub: 'Narx klubda belgilanadi',
      recommended: 'Tavsiya',
      realtimeTitle: 'Real vaqtda yangilanadi',
      realtimeSub: 'Mavjudlik hozircha real vaqt holatida.',
      emptyTitle: 'Hech qanday zona yo\'q',
      emptySub: 'Hozircha barcha zonalar yopiq yoki band.',
    },
    clubDetails: {
      reviewCount: '({n} sharh)',
      open24h: 'Ochiq · 24 soat',
      open: 'Ochiq',
      closed: 'Yopiq',
      feature1: 'Kuchli\nPC',
      feature2: 'PS5\nzonasi',
      feature3: 'Tez\ninternet',
      feature4: 'Premium\nmuhit',
      galleryTitle: 'Klubdan rasmlar',
      galleryViewAll: "Barchasini ko'rish",
      galleryCounter: '{current} / {total}',
      galleryCloseA11y: 'Galereyani yopish',
      reviewsLink: "Sharhlarni ko'rish va baho yozish",
      direction: "Yo'nalish",
      book: 'Bron qilish',
      favoriteAdded: "Sevimlilarga qo'shildi",
      favoriteRemoved: 'Sevimlilardan olib tashlandi',
      favoriteToggleA11y: "Sevimlilarga qo'shish",
      shareA11y: "Klubni ulashish",
      shareError: "Ulashish amalga oshmadi",
      showMore: "Ko'proq",
      showLess: 'Yopish',
      shareMessage: "{name} klubini Nexora ilovasida ko'rib chiqing!",
      notFoundTitle: 'Klub topilmadi',
      notFoundSub: "Bu klub mavjud emas yoki o'chirilgan.",
      notFoundBtn: 'Orqaga',
      addressUnknown: 'Manzil kiritilmagan',
      loading: 'Yuklanmoqda...',
      notJoinedTitle: 'Avval klubga qo\'shiling',
      notJoinedMessage: 'Bu klubda bron qilish uchun avval klubga a\'zo bo\'lishingiz kerak.',
      notJoinedConfirm: 'Qo\'shilish',
      switchingClubToast: 'Klubga ulanmoqda...',
      promotionsTitle: 'Klub aksiyalari',
      promotionsEmpty: "Hozircha bu klubda faol aksiya yo'q.",
    },
    walletTopup: {
      headerTitle: "Hisobni to'ldirish",
      amountLabel: 'Summani kiriting',
      amountUnit: "so'm",
      methodLabel: "To'lov usuli",
      methodPayme: 'Payme',
      methodClick: 'Click',
      methodFee: 'Komissiya 0%',
      payBtn: "To'lash {amount} so'm",
      secure: "Xavfsiz to'lov tizimi",
      successToast: "Hisob muvaffaqiyatli to'ldirildi!",
      errorTitle: 'Xatolik',
      errorOpenUrl: "To'lov tizimini ochib bo'lmadi. Brauzer ishlayotganini tekshiring.",
    },
    clubJoin: {
      headerTitle: "Klubga qo'shilish",
      title: 'Klub kodini kiriting',
      subtitle: "Klub administratori bergan\ntaklif kodini kiriting yoki QR orqali skanerlang.",
      placeholder: 'Masalan: NEXORA-2024',
      qrAlt: 'QR kod orqali kirish',
      helpTitle: 'Kod qayerdan olinadi?',
      helpText: "• Klub administratoridan so'rang\n• Klub kassirida turgan QR kodda bor\n• Do'stingiz sizga taklif yuborgan bo'lishi mumkin",
      joinBtn: "Qo'shilish",
      errorEmpty: 'Klub kodini kiriting',
      successToast: "Klubga qo'shildingiz!",
      passwordLabel: 'Klub paroli',
      passwordPlaceholder: 'Kamida {n} ta belgi',
      passwordHint: "Bu parol shu klubga tegishli — kelajakda kirish uchun saqlanadi. Kamida {n} ta belgi.",
      errorPasswordTooShort: "Parol kamida {n} ta belgi bo'lishi kerak",
      passwordShow: "Parolni ko'rsatish",
      passwordHide: 'Parolni yashirish',
      scannedFillPasswordHint: "Kod kiritildi — endi parolni yozing",
    },
    clubPreviewScreen: {
      headerTitle: "Klub haqida",
      joinBtn: "Klubga qo'shilish",
    },
    profileEdit: {
      headerTitle: 'Profilni tahrirlash',
      changeAvatar: 'Avatarni almashtirish',
      changeAvatarHint: 'Galereyadan rasm tanlash uchun bosing',
      firstName: 'Ism',
      lastName: 'Familiya',
      login: 'Login',
      phone: 'Telefon raqami',
      phonePlaceholder: '+998 90 123 45 67',
      phoneHint: "Klubdan sizga bog'lanish uchun ishlatiladi",
      phoneTooLong: 'Telefon raqami juda uzun',
      nameTooLong: 'Ism yoki familiya juda uzun (max 64 ta belgi)',
      email: 'Email',
      avatarUrlLabel: 'Avatar havolasi',
      saveBtn: 'Saqlash',
      successToast: 'Profil yangilandi',
      avatarUploadingHint: 'Yuklanmoqda…',
      avatarUploadedToast: 'Avatar yangilandi',
      avatarUploadFailed: "Avatar yuklab bo'lmadi, qayta urinib ko'ring",
      galleryDenied: 'Galereyaga ruxsat berilmadi',
      avatarTooLarge: 'Rasm juda katta. Maksimum 5 MB',
      avatarTooLargeWithSize: 'Rasm juda katta ({size} MB). Maksimum {max} MB',
      avatarBadDimensions: "Rasm o'lchami noto'g'ri. 64×64 dan kichik yoki 2000×2000 dan katta bo'lmasin",
      avatarTooSmallWithDims: "Rasm juda kichik. Minimum {min}×{min} piksel kerak",
      avatarTooBigDimsWithDims: "Rasm o'lchami juda katta. Maksimum {max}×{max} piksel",
      avatarBadFormat: "Format qo'llab-quvvatlanmaydi. JPG, PNG yoki WEBP yuboring (HEIC bo'lsa, avval JPG ga aylantiring)",
      avatarNetworkError: "Internet aloqasi yo'q. Wi-Fi yoki mobil internetni tekshiring",
      avatarServerError: 'Server xatosi. Birozdan keyin qayta urinib ko\'ring',
    },
    writeReview: {
      headerTitle: 'Sharh yozish',
      rateLabel: 'Klubni baholang',
      rate1: 'Yomon',
      rate2: 'Qoniqarli',
      rate3: "O'rtacha",
      rate4: 'Yaxshi',
      rate5: "A'lo",
      pickClub: 'Klubni tanlang',
      commentLabel: 'Sharhingiz',
      commentPlaceholder: 'Tajribangiz haqida yozing...',
      submitBtn: 'Yuborish',
      successToast: 'Sharhingiz qabul qilindi',
      errorMissing: "Reyting va sharh to'liq bo'lishi kerak",
      atmosphereLabel: 'Atmosfera',
      cleanlinessLabel: 'Tozalik',
      technicalLabel: 'Texnik holat',
      peripheralsLabel: 'Aksessuarlar',
    },
    myReviews: {
      headerTitle: 'Mening sharhlarim',
      countLabel: '{n} ta sharh yozgansiz',
      emptyTitle: "Hali sharh yo'q",
      emptySub: 'Klubga tashrif buyurganingizda fikringizni qoldiring — bu boshqa o\'yinchilarga yordam beradi.',
      technicalLabel: 'Texnik',
      peripheralsLabel: 'Aksessuarlar',
      unknownClub: 'Klub',
    },
    achievements: {
      headerTitle: 'Yutuqlar',
      tabBadges: 'Nishonlar',
      tabCollected: 'Toplangan',
      tabStats: 'Statistika',
      progress: 'Jarayon',
      earned: 'Olingan',
      locked: 'Yopiq',
      statTotalScore: 'Jami ball',
      statTrophies: 'Nishonlar',
      statWins: "G'alabalar",
      statRank: 'Reyting',
      sectionFeatured: "So'nggi mukofot",
      viewBtn: "Mukofotni ko'rish",
      xpLabel: 'Yutuq ballari',
      badgesSection: 'Yutuqlar',
      badgeCount: '38 / 56',
      seasonRewards: 'Mavsumiy mukofotlar',
      seasonName: 'Mavsum 5',
      seasonEnds: 'Mavsum yakunlanishigacha: 18 kun',
      badge1Title: "Turnir g'olibi",
      badge1Sub: '5 marta',
      badge2Title: "G'alaba seriyasi",
      badge2Sub: "10 g'alaba",
      badge3Title: 'Eng yaxshi',
      badge3Sub: 'MVP 25 marta',
      badge4Title: 'Jamoa yetakchisi',
      badge4Sub: "50 o'yin",
      badge5Title: 'Kumush medal',
      badge5Sub: "2-marta 2-o'rin",
      badge6Title: 'Bronze medal',
      badge6Sub: "3-marta 3-o'rin",
      soonTitle: 'Yutuqlar tez orada',
      soonSubtitle: "Yutuqlar tizimi tayyorlanmoqda. Tez orada o'ynagan o'yinlaringiz uchun nishon va sovrinlar olasiz.",
      soonBadge: 'Tez orada',
    },
    smartQueue: {
      headerTitle: 'Smart Navbat',
      title: "Bo'sh joy chiqishini\nkutib turing",
      subtitle: "AI sizga eng tezroq bo'shaydigan joyni topadi",
      noQueueTitle: 'Hozircha navbatda emassiz',
      noQueueSub: 'Quyidagi tugmani bosib navbatga turing',
      activeTitle: 'Sizning navbatingiz',
      yourPosition: 'Sizning o\'rningiz',
      estimatedWait: 'Taxminiy kutish',
      estimatedMinutes: '~{n} daqiqa',
      pcCode: 'PC: {code}',
      leaveBtn: 'Navbatdan chiqish',
      joinBtn: 'Navbatga turish',
      minutes: '{n} daq',
      successJoined: 'Navbatga turdingiz',
      successLeft: 'Navbatdan chiqdingiz',
    },
    smartSeat: {
      headerTitle: 'Smart Seat',
      title: 'AI sizga eng yaxshi joyni\ntavsiya qiladi',
      subtitle: 'O\'tgan tajribalaringiz asosida tahlil qilamiz',
      aiTag: 'AI tavsiya',
      reasonLabel: 'Nega bu joy?',
      pcLabel: 'Tavsiya etilgan PC',
      statusFree: "Bo'sh",
      holdBtn: 'Bu joyni hold qilish',
      successHeld: 'Joy hold qilindi',
    },
    teamFinder: {
      headerTitle: "Jamoa topish",
      title: "O'yinchilarni qidiring va\njamoa tuzing",
      gameDropdown: "O'yin",
      skillDropdown: 'Daraja',
      micToggle: 'Mikrofonli',
      sectionPlayers: "O'yinchilar",
      sectionTeams: 'Faol jamoalar',
      inviteBtn: 'Taklif',
      joinBtn: "Qo'shilish",
      createBtn: 'Jamoa yaratish',
      cancelBtn: 'Bekor qilish',
      emptyPlayers: "Bu o'yin uchun o'yinchi topilmadi",
      invitePickerTitle: "{name}'ni qaysi jamoaga taklif qilasiz?",
      invitedToast: 'Taklif yuborildi',
      createdToast: 'Jamoa yaratildi',
      noTeamHint: "Avval jamoa yarating, keyin o'yinchi qo'shing",
      createSectionName: 'Jamoa nomi',
      createPlaceholder: "Masalan: Nexora Stars",
      createHelperGame: "{game} uchun jamoa yaratiladi",
      statusOnline: 'Online',
      statusInGame: "O'yinda",
      statusOffline: 'Offline',
      invitesTitle: 'Yangi takliflar · {n}',
      inviteAccept: 'Qabul',
      inviteDecline: 'Rad',
      inviteAcceptedToast: "{name} jamoasiga qo'shildingiz",
      inviteDeclinedToast: 'Taklif rad etildi',
      unknownTeam: 'Jamoa',
      inviteSlotsLabel: '{n} ta joy',
      stubHint: 'Klub ishtirokchisi',
      gameSheetTitle: "O'yinni tanlang",
      myTeamsTitle: "Mening jamoalarim · {n}",
    },
    clubReviewsList: {
      headerTitle: 'Sharhlar',
      avgLabel: "O'rtacha reyting",
      writeBtn: 'Sharh yozish',
      sectionRecent: "So'nggi sharhlar",
      writeDisabledIn: 'Keyingi sharh {n} soat keyin',
    },
    clubsSwitch: {
      headerTitle: 'Mening klublarim',
      sectionMine: 'Klublarim',
      activeBadge: 'Faol',
      addBtn: "Yangi klub qo'shish",
      leaveConfirmTitle: 'Klubdan chiqish',
      leaveConfirmMessage: "Haqiqatan ham bu klubdan chiqmoqchimisiz?",
      leaveBtn: 'Chiqish',
      cancelBtn: 'Bekor qilish',
      leftToast: 'Klubdan chiqdingiz',
      activatedToast: 'Klub faollashtirildi',
    },
    rewardsStore: {
      headerTitle: 'Mukofotlarni almashtirish',
      myPoints: 'Mening ballim',
      points: 'ball',
      tabAll: 'Barchasi',
      tabGames: "O'yin",
      tabFood: 'Taom',
      tabVip: 'VIP',
      tabPromos: 'Aksiyalar',
      historyBtn: 'Tarixim',
      cost: '{n} ball',
      reward1Title: "1 soat bepul o'yin",
      reward1Sub: 'Istalgan klubda',
      reward2Title: 'Snack set vaucheri',
      reward2Sub: 'Ichimlik + Snak',
      reward3Title: 'VIP xona 1 soat',
      reward3Sub: 'Premium xona',
      reward4Title: 'Turnirda ishtirok',
      reward4Sub: 'Turnir chiptasi',
      reward5Title: '10% chegirma kuponi',
      reward5Sub: 'Istalgan xizmatga',
      reward6Title: '20% chegirma kuponi',
      reward6Sub: 'Istalgan xizmatga',
    },
    notifications: {
      headerTitle: 'Bildirishnomalar',
      tabAll: 'Barchasi',
      tabBookings: 'Bronlar',
      tabTournaments: 'Turnirlar',
      tabOffers: 'Takliflar',
      tabSystem: 'Tizim',
      emptyTitle: "Hech qanday xabar yo'q",
      emptySub: "Bu turdagi yangi xabar paydo bo'lganida shu yerda ko'rinadi.",
      markAllRead: "Barchasini o'qildi deb belgilash",
      clearAll: 'Hammasini tozalash',
      clearAllA11y: 'Bildirishnomalarni tozalash',
      clearAllConfirmTitle: 'Hammasini tozalash?',
      clearAllConfirmMessage: "Barcha bildirishnomalar o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
      clearAllConfirm: 'Tozalash',
      clearAllCancel: 'Bekor qilish',
      clearAllToast: 'Bildirishnomalar tozalandi',
      timeMinutes: '{n} daqiqa oldin',
      timeHours: '{n} soat oldin',
      timeNow: 'Hozir',
      settingsA11y: 'Bildirishnoma sozlamalari',
      n1Title: 'Bron tasdiqlandi',
      n1Desc: 'Nexora Arena Koramangala uchun 24 May, 18:00 broningiz tasdiqlandi.',
      n1Time: '2 daqiqa oldin',
      n2Title: 'Turnir eslatmasi',
      n2Desc: 'Dota 2 Night Cup turniri ertaga 20:00 da boshlanadi.',
      n2Time: '15 daqiqa oldin',
      n3Title: 'Taklif ochildi!',
      n3Desc: "20% chegirma kuponingiz faol bo'ldi. Bugun oxirigacha amal qiladi.",
      n3Time: '1 soat oldin',
      n4Title: 'AI tavsiyasi',
      n4Desc: "Siz uchun yangi AI Arena zonasi tavsiya qilindi. Sinab ko'ring!",
      n4Time: '2 soat oldin',
      n5Title: 'Tizim xabari',
      n5Desc: 'Ilovaga yangi yangilanish mavjud. Yangilashni unutmang.',
      n5Time: '5 soat oldin',
    },
    sessionInvites: {
      headerTitle: "O'yin takliflari",
      subtitle: "Do'stlaringizdan kelgan birga o'ynash takliflari",
      emptyTitle: "Hozircha takliflar yo'q",
      emptySub: "Sizga hech kim o'yin taklifi yubormagan",
      inviteFromTitle: '{name} sizni taklif qildi',
      pcLabel: 'PC: {code}',
      accept: 'Qabul',
      reject: 'Rad',
      acceptedToast: "Taklif qabul qilindi",
      rejectedToast: 'Rad etildi',
    },
    bookingExit: {
      title: 'Bron qilishdan chiqish',
      message: "Bron jarayonidan chiqmoqchimisiz? Tanlovlaringiz saqlanmaydi.",
      cancel: 'Davom etish',
      confirm: 'Chiqish',
    },
    walletScreen: {
      pickerTitle: 'Klubni tanlang',
      pickerSub: "Hamyon klubning balansiga bog'langan",
      noClubs: "Hech qanday a'zo bo'lgan klub yo'q",
      joinClubBtn: "Klubga qo'shilish",
      emptyTitle: 'Klub tanlanmagan',
      emptyDesc: "Hamyon har bir klub uchun alohida. Balansingizni ko'rish uchun avval klub tanlang.",
      emptyPickBtn: 'Klub tanlash',
      emptyJoinLink: "Yangi klubga qo'shilish",
      clubLabel: 'Klub:',
      balanceLabel: 'Klubdagi balans',
      statCashback: 'Keshbek',
      statTodayCashback: 'Bugungi cashback',
      cardsTitle: 'Mening kartalarim',
      cardsAction: 'Barcha kartalar',
      cardMain: 'Asosiy karta',
      quickTopup: "Tezkor to'ldirish",
      topupBtn: "To'ldirish",
      pointsLabel: 'ball',
      balanceShort: 'Balans',
      liveLabel: 'LIVE',
      bonusLabel: 'Bonus',
      paymentMethodsTitle: "To'lov usullari",
      paymentMethodA11y: "{name} bilan to'lash",
      paymeSub: 'Karta yoki bank orqali',
      clickSub: 'Tez to\'lov tizimi',
    },
    components: {
      breadcrumbZone: 'Zona',
      breadcrumbSeat: 'Joy',
      breadcrumbTime: 'Vaqt',
      breadcrumbPay: "To'lov",
      clubOpen: 'Ochiq',
      clubClosed: 'Yopiq',
      clubPsZones: 'PS zona',
      club24h: '24/7 ochiq',
      clubVerified: '✓ Tasdiqlangan',
      clubSoonDetails: "Tafsilotlar tez orada",
      walletBalanceLabel: 'Hisob balansingiz',
      walletPointsLabel: 'ball',
      membershipBalance: 'Klubdagi balansingiz',
      membershipTopup: "To'ldirish",
      countdownLabel: 'Boshlanishigacha vaqt',
      unitHours: 'soat',
      unitMinutes: 'daqiqa',
      unitSeconds: 'soniya',
      qaBook: 'Band qilish',
      qaPs: 'PS zona',
      qaTournaments: 'Turnirlar',
      qaTopup: "To'ldirish",
      webMapTitle: 'Xarita mobil ilovada',
      webMapSub: "Real xaritani ko'rish uchun ilovani telefoningizdan oching.",
    },
    clubsList: {
      headerTitle: 'Klublar',
      tabMine: 'Mening klublarim',
      tabAll: 'Boshqa klublar',
      emptyTitle: "Hali bironta klubga qo'shilmagansiz",
      emptySub: "Barcha klublardan tanlab a'zo bo'lib chiqing yoki kod orqali qo'shiling.",
      joinBtn: "Klubga qo'shilish",
    },
    promotionsList: {
      headerTitle: 'Aktiv aksiyalar',
      emptyTitle: "Hozircha aktiv aksiya yo'q",
      emptySub: "Klublar yangi aksiyalar e'lon qilganda shu yerda ko'rinadi.",
    },
    rewardsCenter: {
      headerTitle: 'Mening mukofotlarim',
      totalLabel: 'Jami ball',
      levelLabel: 'Sizning darajangiz',
      levelName: 'NEXORA PRO',
      levelInfo: 'Level 12',
      streakLabel: 'Kundalik seriya',
      streakDays: '{n} kun',
      streakSub: "Davom eting va ko'proq yuting!",
      activeMissions: 'Faol missiyalar',
      viewAll: "Barchasini ko'rish",
      recentAchievements: "So'nggi yutuqlar",
      claimBtn: 'Olish',
      claimingBtn: '...',
    },
    tournaments: {
      headerTitle: 'Turnirlar',
      statusAll: 'Barchasi',
      statusLive: 'Jonli',
      statusUpcoming: 'Kelajakdagi',
      statusFinished: 'Yakunlangan',
      sectionFeatured: 'Tavsiya etilgan',
      sectionUpcoming: 'Kelajakdagi turnirlar',
      liveBadge: 'JONLI',
      registrationEndsIn: "Ro'yxatdan o'tish yakuni",
      teamsCount: 'jamoa',
      registerBtn: "Ro'yxatdan o'tish",
      emptyList: "Bu filterda turnir yo'q",
    },
    tournamentDetails: {
      headerTitle: 'Turnir tafsilotlari',
      liveBadge: 'JONLI',
      prizeLabel: "Umumiy mukofot jamg'armasi",
      statRegistrationEnds: "Ro'yxatdan o'tish yakuni",
      statStart: 'Boshlanish vaqti',
      statTeams: 'Jamoalar',
      statFormat: 'Turnir formati',
      statServer: 'Server',
      tabDetails: 'Tafsilotlar',
      tabSchedule: 'Jadval',
      tabParticipants: 'Ishtirokchilar',
      tabRules: 'Qoidalar',
      aboutTitle: 'Turnir haqida',
      aboutDesc: "CS2 bo'yicha ochiq turnir. Eng yaxshi jamoalar 1 500 000 so'm mukofot jamg'armasi uchun kurashadi!",
      prizesTitle: 'Mukofotlar taqsimoti',
      prize1: "1-o'rin",
      prize2: "2-o'rin",
      prize3: "3-o'rin",
      prize4: "4-o'rin",
      registerBtn: "Ro'yxatdan o'tish",
      registeredBtn: "Ro'yxatdan o'tdingiz",
      waitlistBtn: 'Navbatdasiz',
      toastRegistered: "Turnirga muvaffaqiyatli qo'shildingiz!",
      toastWaitlist: "Joy to'lib qoldi — siz navbatdasiz",
      notFound: 'Turnir topilmadi',
      teamsRegistered: "jamoa ro'yxatdan o'tgan",
      shareA11y: 'Turnirni ulashish',
      scheduleSoon: 'Jadval tez orada\nTurnir boshlanganda matchlar tartibi shu yerda chiqadi',
      participantsSoon: "Ishtirokchilar ro'yxati tez orada\nRo'yxatdan o'tgan jamoalar shu yerda ko'rinadi",
    },
    friends: {
      headerTitle: "Do'stlar",
      tabMine: "Mening do'stlar",
      tabSearch: 'Qidirish',
      sectionMine: "Mening do'stlarim ({n})",
      pendingTitle: "{n} ta yangi so'rov",
      pendingSub: "Ko'rish uchun bosing",
      searchPlaceholder: "Login yoki ism bo'yicha qidirish...",
      searchEmptyTitle: 'Foydalanuvchini qidiring',
      searchEmptySub: 'Login yoki ismni kiritib Enter bosing',
      foundCount: 'Topildi: {n}',
      addBtn: "Do'st qo'shish",
      removeBtn: "O'chirish",
      emptyTitle: "Hozircha do'stlar yo'q",
      emptySub: '"Qidirish" tabidan boshqa o\'yinchilarni izlang va do\'st qilib qo\'shing',
      sentToast: "Do'stlik so'rovi yuborildi",
      removedToast: "Do'stlardan olib tashlandi",
      searchPromptTitle: 'Foydalanuvchini qidiring',
      searchPromptSub: "Login yoki ismni kiritib qidirish tugmasini bosing",
      outgoingTitle: "Yuborilgan so'rovlar · {n}",
      cancelBtn: 'Bekor qilish',
      cancelledToast: "So'rov bekor qilindi",
      removeConfirmTitle: "Do'stlardan olib tashlash?",
      removeConfirmMessage: "{name} bilan do'stlik bekor qilinadi.",
      removeConfirmYes: 'Olib tashlash',
      removeConfirmNo: 'Bekor',
      alreadyFriendsBadge: "Do'st",
      blockedBadge: 'Bloklangan',
    },
    friendRequests: {
      headerTitle: "So'rovlar",
      subtitle: "Sizga yuborilgan do'stlik so'rovlari",
      emptyTitle: "So'rov yo'q",
      emptySub: "Sizga hech kim do'stlik so'rovi yubormagan",
      accept: 'Qabul',
      reject: 'Rad',
      acceptedToast: "Do'st sifatida qo'shildi",
      rejectedToast: "So'rov rad etildi",
    },
    favorites: {
      headerTitle: 'Saralanganlar',
      headerAction: 'Barchasi',
      sectionFav: 'Sevimli klublar',
      sectionRebook: 'Tezkor qayta bron qilish',
      rebookBtn: 'Bron qilish',
      lastBooked: "So'ngi bron: {date}",
      metaPc: 'PC zona',
      metaPs: 'PS zona',
      emptyTitle: "Sevimli klublar yo'q",
      emptySub: "Klub sahifasida ❤ tugmasini bosing — bu yerda ko'rinadi.",
      discoverBtn: 'Klublarni topish',
      countLabel: '{n} ta saqlangan',
      removedToast: '{name} olib tashlandi',
      clearAllAction: 'Tozalash',
      clearAllTitle: "Hammasini o'chirish?",
      clearAllMessage: "Sevimlilardan {n} ta klub o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
      clearAllConfirm: "O'chirish",
      clearAllCancel: 'Bekor qilish',
      clearedToast: "Sevimlilar tozalandi",
      fallbackName: 'Klub',
    },
    aiAssistant: {
      name: 'Nexora AI',
      role: 'AI yordamching',
      greeting: 'Salom, Akmal! Bugun qanday yordam bera olaman?',
      sectionTips: 'Siz uchun aqli tavsiyalar',
      sectionHelp: 'Nima bilan yordam beray?',
      tip1: "Siz odatda kechqurun o'ynaysiz. 21:00-00:00 oralig'ida klublar bo'sh va bonuslar ko'proq.",
      tip2: 'Yaqin atrofda 2 ta klubda 20% chegirma.',
      tip3: "Agar jamoa bilan o'ynasangiz, ko'proq ball va sovrin yutishingiz mumkin.",
      chip1: 'Yaqin klublar',
      chip2: 'Eng yaxshi vaqtlar',
      chip3: 'Bonuslar va aksiyalar',
      chip4: 'Jamoa topish',
      inputPlaceholder: 'Xabar yozing...',
    },
    helpSupport: {
      headerTitle: "Yordam va qo'llab-quvvatlash",
      aiTitle: 'Nexora yordamchisi',
      aiSubtitle: 'Savollaringiz bormi?\nBiz yordam berishga tayyormiz!',
      searchPlaceholder: 'Savolingizni yozing...',
      quickActions: 'Tezkor amallar',
      actionChat: 'Jonli chat',
      actionChatSub: 'Operator bilan chat',
      actionCall: "Qo'ng'iroq qilish",
      actionCallSub: "Qo'llab-quvvatlash markazi",
      actionSubmit: "So'rov yuborish",
      actionSubmitSub: "So'rovingizni yuboring",
      actionRemote: 'Masofaviy yordam',
      actionRemoteSub: 'Masofaviy yordam olish',
      popularTopics: 'Tez-tez beriladigan savollar',
      topic1: "Bronni o'zgartirish / bekor qilish",
      topic2: "To'lov va qaytarish",
      topic3: 'Ball va sodiqlik dasturi',
      viewAll: "Barchasini ko'rish",
      topicsEmpty: "Hozircha savol-javoblar mavjud emas.",
      topicsLoading: "Yuklanmoqda...",
      stillNeedHelp: "Javob topa olmadingizmi? Quyidagi kanallar orqali biz bilan bog'laning.",
      ticketSubtitle: "Sizga qanday yordam kerakligini batafsil yozing",
      ticketSubject: 'Mavzu',
      ticketSubjectPlaceholder: 'Masalan: To\'lov muammosi',
      ticketMessage: 'Xabar',
      ticketMessagePlaceholder: "Muammoni batafsil bayon qiling...",
      ticketSendBtn: 'Yuborish',
      ticketSuccess: "So'rov yuborildi. Tez orada javob beramiz.",
      ticketErrorEmpty: "Xabar bo'sh bo'lmasligi kerak",
    },
    teamChat: {
      tabChat: 'Chat',
      tabMembers: "A'zolar",
      tabSettings: 'Sozlamalar',
      voiceLabel: 'Ovozli kanal',
      voiceLobby: 'Lobby',
      joinVoice: 'Ovozli kanalga kirish',
      joinedVoice: 'r3v0lt ovozli kanalga qo\'shildi · 20:25',
      inputPlaceholder: 'Xabar yozing...',
      me: 'Siz',
      emptyChat: "Hali xabar yo'q. Birinchi xabarni yozing.",
      membersSoon: "A'zolar paneli tez orada\nJamoa a'zolari, rollar va elo bu yerda chiqadi",
      settingsSoon: "Jamoa sozlamalari tez orada\nNomi, logosi, qoidalari va ruxsatlar shu yerda boshqariladi",
      you: 'siz',
      roleOwner: 'Kapitan',
      roleInvited: 'Taklif qilingan',
      membersEmpty: "A'zolar topilmadi",
      menuA11y: "Jamoa amallari",
      leaveAction: "Jamoadan chiqish",
      disbandAction: "Jamoani tarqatish",
      leaveConfirmTitle: "Jamoadan chiqasizmi?",
      leaveConfirmMessage: "Siz endi bu chatda yoza olmaysiz va yangi xabarlar kelmaydi.",
      leaveConfirmYes: "Chiqish",
      leaveConfirmNo: "Bekor",
      leftToast: "Jamoadan chiqdingiz",
      disbandConfirmTitle: "Jamoani tarqatasizmi?",
      disbandConfirmMessage: "Bu amalni qaytarib bo'lmaydi. Barcha a'zolar va xabarlar o'chiriladi.",
      disbandConfirmYes: "Tarqatish",
      disbandConfirmNo: "Bekor",
      disbandedToast: "Jamoa tarqatildi",
    },
    partyBooking: {
      headerTitle: "Birga o'ynash",
      title: "Do'stlaringiz bilan\nbirga bron qiling",
      subtitle: "Joylarni tanlang va do'stlarni taklif qiling — hammangiz birga o'ynaysiz",
      step1: "1. Bo'sh joylarni tanlang ({selected}/{total})",
      step2: "2. Do'stlarni taklif qiling ({selected}/{total})",
      noFreeSeats: "Hozir bo'sh joy yo'q",
      noFriends: "Sizda hali do'stlar yo'q",
      findFriends: "Do'st topish →",
      bookCta: "{pcs} ta joy + {friends} ta do'st bilan bron qilish",
      errorTitle: 'Xato',
      errorMin1Pc: 'Kamida bitta PC tanlang',
      successTitle: 'Tayyor!',
      successMessage: "Joylar bron qilindi va do'stlarga taklif yuborildi",
      partialInvitesMessage: "Joylar bron qilindi, ammo {n} ta do'stga taklif yuborilmadi",
    },
    smartRec: {
      headerTitle: 'Tavsiyalar',
      title: 'Siz uchun\ntanlanganlar',
      aiTag: 'AI tavsiya',
      bestClubs: 'Eng yaxshi klublar',
      bestZones: 'Eng yaxshi zonalar',
      bestTimes: 'Eng yaxshi vaqt oraliqlari',
      viewAll: "Barchasini ko'rish",
      today: 'Bugun',
      zonePs: 'PS zona',
      zonePsMeta: "Yuqori samaradorlik · Bo'sh",
      zoneVip: 'VIP xona',
      zoneVipMeta: 'Yuqori komfort · Kam band',
      zoneVr: 'VR zona',
      zoneVrMeta: 'Eng immersiv tajriba',
      timeGoodLoad: 'Yaxshi bandlik',
      timeMostPopular: 'Eng mashhur',
      timeLowLoad: 'Kam bandlik',
      emptyClubs: "AI hozircha tavsiya bera olmadi — keyinroq qaytib keling",
    },
    rating: {
      headerTitle: 'Reyting',
      scopeGlobal: 'Global',
      scopeRegion: 'Mintaqa',
      scopeFriends: "Do'stlarim",
      filterTop: 'Top 100',
      filterSeason: 'Mavsum 5',
      columnPlayer: "O'yinchi",
      columnRating: 'Reyting',
      you: 'Siz (NexoraWolf)',
      footer: 'Reyting har 24 soatda yangilanadi',
    },
    referEarn: {
      headerTitle: 'Taklif qiling',
      title: "Do'st taklif qiling,\nmukofot oling!",
      codeLabel: 'Sizning taklif kodingiz',
      linkLabel: 'Taklif havolangizni ulashing',
      howItWorks: 'Qanday ishlaydi?',
      step1: "Do'stingiz kodingiz bilan ro'yxatdan o'tadi",
      step2: "U birinchi marta o'ynaydi",
      step3: 'Ikkalangiz ham mukofot olasiz',
      yourReferrals: 'Siz taklif qilganlar',
      statInvites: 'Takliflar',
      statActive: "Faol do'stlar",
      statPoints: 'Topgan ball',
      milestones: 'Milestone mukofotlar',
      milestone5: "5 ta do'st taklif qiling",
      milestone10: "10 ta do'st taklif qiling",
      milestone20: "20 ta do'st taklif qiling",
      received: 'Olingan',
      milestoneTemplate: "{n} ta do'stni taklif qil",
      copiedToast: 'Kod buferga nusxalandi',
      shareMessage: "Nexora'ga qo'shilish uchun mening havolam:",
      copyCodeA11y: 'Kodni nusxalash',
      shareLinkA11y: 'Havolani ulashish',
    },
    statistics: {
      headerTitle: 'Statistika',
      title: 'Mening statistikam',
      proBadge: 'NEXORA PRO',
      levelLabel: 'Level {n}',
      overall: "Umumiy ko'rsatkichlar",
      viewAll: "Barchasini ko'rish",
      statHours: "O'ynagan soatlar",
      statSessions: 'Sessiyalar',
      statFavoriteClubs: 'Sevimli klublar',
      statTotalSpent: 'Jami sarf',
      statFavoriteGames: "Sevimli o'yinlar",
      statAvgRating: "O'rtacha reyting",
      valueHours: '{n} soat',
      valueSessions: '{n} marta',
      valueClubs: '{n} ta',
      aiInsight: 'AI insight',
      insightLine1: "Siz strategik o'yinlarni yaxshi ko'rasiz va kechqurun faol bo'lasiz.",
      insightLine2: "Siz uchun 20:00–23:00 oralig'idagi klublar va jamoaviy rejimlar optimal.",
    },
    onboarding: {
      skip: "O'tkazib yuborish",
      page1Tagline1: "O'yining. Maydoning.",
      page1Tagline2: "G'alabang. Har doim. Har yerda.",
      page1Footer1: 'Chempionlar uchun yaratilgan.',
      page1Footer2: 'Geymerlar uchun qudratli.',
      page2TitlePart1: 'Sizga yaqin\neng zo\'r ',
      page2TitleAccent: 'klublarni',
      page2TitlePart2: '\ntoping',
      page2Subtitle: 'Top reytingli klublar, PS zonalar,\nturnirlar va ajoyib muhit sizni\nkutmoqda.',
      page3TitlePart1: 'Band qiling.\n',
      page3TitleAccent1: "To'ldiring. ",
      page3TitleAccent2: "O'ynang.",
      page3Subtitle: "Kompyuterni band qiling, balansni\nto'ldiring va o'yin dunyosiga sho'ng'ing.\nHech narsani o'tkazib yubormang.",
      page3Feat1Title: 'Kompyuterlar',
      page3Feat1Sub: 'Yuqori samaradorlik',
      page3Feat2Title: 'PS zona',
      page3Feat2Sub: 'Zarur jihozlar bilan',
      page3Feat3Title: "To'ldirish",
      page3Feat3Sub: 'Tez va xavfsiz',
    },
    services: {
      headerTitle: 'Xizmatlar',
      yourSession: 'Sizning sessiyangiz',
      activeBadge: 'Faol',
      balanceLabel: 'Qolgan balans',
      sectionTitle: "So'rov va yordam",
      staffTitle: 'Xodim chaqirish',
      staffSub: 'Yordam uchun xodimni stolga chaqirasiz',
      issueTitle: 'Muammo bildirish',
      issueSub: 'Texnik nosozlik yoki shikoyat',
      supportTitle: "Qo'llab-quvvatlash",
      supportSub: 'Yordam markazi va texnik yordam',
      staffDefaultMsg: 'Yordam kerak',
      issueDefaultMsg: 'Texnik muammo',
      staffSentToast: "Xodim chaqirildi, kuting iltimos",
      issueSentToast: "Muammo qabul qilindi",
    },
    qrScan: {
      headerTitle: 'QR bilan kirish',
      subtitle: "Kompyuter stikeridagi QR kodni skanerlang — sessiya darhol boshlanadi.",
      orCode: 'Yoki kodni kiriting',
      actionFlash: 'Chiroq',
      actionGallery: 'Galereyadan',
      guide: "QR qanday ishlaydi?",
      invalidFormat: "QR formati noto'g'ri. Masalan: 42:abc123",
      scanCta: 'Kamera bilan skanerlash',
      cameraPermTitle: 'Kameraga ruxsat kerak',
      cameraPermSub: "QR kodni skanerlash uchun kameraga ruxsat bering. Hech qanday rasm yoki video saqlanmaydi.",
      cameraPermCta: 'Ruxsat berish',
      cameraDenied: "Kameraga ruxsat berilmadi. Sozlamalardan yoqing.",
      galleryDenied: 'Galereyaga ruxsat berilmadi',
      galleryDecodeFailed: 'Rasmda QR kod topilmadi',
      galleryPickFailed: "Rasmni ochib bo'lmadi. Boshqa rasmni tanlang",
      alignHint: "QR kodni kvadrat ichiga joylashtiring",
      viewfinderTitle: 'Kamerani oching',
      viewfinderSub: "Stikerni kameraga to'g'rilang — kod avtomatik o'qiladi",
      viewfinderHint: 'Kamerani ochish uchun bosing',
      galleryCta: 'Galereyadan tanlash',
      galleryPicking: 'Yuklanmoqda...',
      orDivider: 'yoki',
      manualToggle: "Kodni qo'lda kiritish",
      manualHint: 'Stiker buzilgan bo\'lsa, kodni qo\'lda kiriting (masalan: 42:abc123)',
      manualPlaceholder: '42:ABC123',
      manualSubmit: 'Kirish',
      helpStep1: 'Klubdagi istalgan bo\'sh kompyuter oldiga o\'tiring.',
      helpStep2: 'Monitor yoki PC kuzovida joylashgan QR stikerni toping.',
      helpStep3: '"Kamera bilan skanerlash" tugmasini bosing va QR ni kvadrat ichiga joylashtiring.',
      submittingHint: 'Tekshirilmoqda...',
      noTenantTitle: 'Avval klub tanlang',
      noTenantHasClubs: "Sessiya boshlash uchun avval klubga o'ting. Profil sahifasidan klub tanlang.",
      noTenantNoClubs: "Hech qanday klubga a'zo emassiz. QR orqali kirish uchun avval klubga qo'shiling.",
      noTenantToast: 'Avval klubga ulaning',
      pickClubBtn: "Klub tanlash",
      joinClubBtn: "Klubga qo'shilish",
    },
    activeSession: {
      headerTitle: 'Faol sessiya',
      pcLabel: 'Kompyuter',
      zoneBadge: 'PS zona',
      startTime: 'Boshlanish vaqti',
      elapsed: "O'tgan vaqt",
      balanceLabel: 'Qolgan balans',
      quickActions: 'Tezkor amallar',
      extend: 'Sessiyani uzaytirish',
      addBalance: "Balans qo'shish",
      switchZone: 'Zonani almashtirish',
      endSession: 'Sessiyani yakunlash',
      tabSession: 'Sessiya',
      tabServices: 'Xizmatlar',
      tabChat: 'Chat',
      tabSettings: 'Sozlamalar',
      open: 'Ochiq',
      awaitingTitle: 'Tasdiqlash kutilmoqda',
      awaitingSub:
        "Sizning kompyuteringiz hali topilmadi. Iltimos, operatorga murojaat qiling yoki QR kodni qaytadan skaner qiling.",
      pendingTitle: "Bron tasdiqlandi",
      pendingSub:
        "Sessiya hali boshlanmagan. Kompyuteringizga o'ting va operator sessiyani ochishini kuting.",
    },
    transactionHistory: {
      headerTitle: 'Tranzaksiyalar tarixi',
      filterAll: 'Barchasi',
      filterTopups: "To'ldirishlar",
      filterBonuses: 'Bonuslar',
      filterCharges: 'Hisobdan yechilgan',
      emptyTitle: "Tranzaksiyalar yo'q",
      emptySub:
        "Balansingizni to'ldirganingizdan keyin shu yerda barcha to'lov tarixi paydo bo'ladi.",
      typeTopup: "Balansni to'ldirish",
      typeBonus: 'Keshbek',
      typePackage: "Paket sotib olindi",
      typeSubscription: 'Obuna',
      typeTierBonus: 'Daraja bonusi',
      typeMissionBonus: 'Missiya mukofoti',
      typeCharge: 'Hisobdan yechildi',
      typeRefund: "Qaytarib berildi",
      typeOther: 'Boshqa',
      topupCta: "Balansni to'ldirish",
    },
    notificationSettings: {
      headerTitle: 'Bildirishnoma sozlamalari',
      soonBannerTitle: "Push xabarnomalar tez orada",
      soonBannerSub:
        "Hozircha sozlamalar lokal saqlanadi. Push yetkazib berish ishga tushgach, tanlovingiz avtomatik qo'llaniladi.",
      categoriesSection: 'Kategoriyalar',
      catBookings: 'Bronlar',
      catBookingsSub: "Bron tasdig'i va eslatmalar",
      catTournaments: 'Turnirlar',
      catTournamentsSub: "Turnir e'lonlari va natijalar",
      catOffers: 'Aksiyalar',
      catOffersSub: 'Chegirmalar va maxsus takliflar',
      catSystem: 'Tizim',
      catSystemSub: "Ilova yangiliklari va xavfsizlik bildirishnomalari",
      viewInboxLabel: 'Barcha bildirishnomalarni ko‘rish',
      viewInboxSub: 'Inbox — o‘qilgan va o‘qilmagan barcha xabarnomalar',
    },
    profile: {
      guestName: 'Mehmon',
      greeting: 'Salom, {name}!',
      levelBadge: 'Daraja {n}',
      statTotalScore: 'Umumiy ball',
      statGames: "O'yinlar",
      favoriteGames: "Sevimli o'yinlar",
      viewAll: 'Barchasi',
      quickLinks: 'Tezkor yorliqlar',
      quickBook: 'Bron qilish',
      quickTournaments: 'Turnirlar',
      quickWallet: 'Hamyon',
      quickRewards: 'Mukofotlar',
      loyaltyTitle: 'Sodiqlik mukofoti',
      loyaltySub: "Bron qiling va ball to'plang,\neksklyuziv sovg'alarni oling!",
      loyaltyBtn: "Mukofotlarni ko'rish",
      loyaltyBtnSoon: 'Tez orada',
      hours: '{n} soat',
      soon: 'Soon',
      soonSection: 'Tez orada',
      soonSubtitle: "Yangi feature'lar tayyorlanmoqda",
      soonExpandHint: 'Ochish uchun bosing',
      soonCollapseHint: 'Yopish uchun bosing',
      menu: {
        ai: 'Nexora AI yordamchisi',
        aiTips: 'AI tavsiyalar',
        rewardsCenter: 'Mukofotlar markazi',
        rewardsShop: "Mukofotlar do'koni",
        referEarn: 'Taklif qil va ol',
        stats: 'Shaxsiy statistika',
        favorites: 'Saralanganlar',
        teams: 'Jamoalar',
        friends: "Do'stlarim",
        friendRequests: "Do'stlik so'rovlari",
        sessionInvites: "O'yin takliflari",
        myClubs: 'Mening klublarim',
        joinClub: "Klubga qo'shilish",
        reviews: 'Sharhlar',
        smartSeat: 'Smart Seat (AI)',
        smartQueue: 'Smart Navbat',
        partyBooking: "Birga o'ynash",
        rating: 'Reyting',
        qrScan: 'QR kirish',
        help: "Yordam va qo'llab-quvvatlash",
        settings: 'Sozlamalar',
      },
    },
    bookings: {
      title: 'Bronlar',
      tabUpcoming: 'Kelgusi bronlar',
      tabHistory: 'Tarix',
      sectionUpcoming: 'Kelgusi bronlar',
      sectionHistory: "O'tgan seanslar",
      statusConfirmed: 'Tasdiqlandi',
      statusCompleted: 'Tugatildi',
      download: 'Kvitansiyani yuklab olish',
      durationHours: '{n} soat',
      emptyTitle: "Hali bronlar yo'q",
      emptySub: 'Yangi bron qiling va shu yerda kuzatib boring.',
      cancelBtn: 'Bekor qilish',
      cancelConfirmTitle: 'Bronni bekor qilasizmi?',
      cancelConfirmMessage:
        "Bron seans boshlanishidan kamida 1 soat oldin bekor qilinishi mumkin. Tasdiqlashdan keyin orqaga qaytarib bo'lmaydi.",
      cancelConfirmBtn: 'Ha, bekor qilish',
      cancelKeepBtn: 'Saqlab qolish',
      cancelSuccess: 'Bron muvaffaqiyatli bekor qilindi',
    },
    zoneSwitch: {
      headerTitle: 'Zonani almashtirish',
      currentLabel: 'Joriy zona',
      standardBadge: 'Standart',
      extraTimeTitle: "Qo'shimcha vaqt",
      upgradeTitle: 'Zonani yangilash',
      timeMin30: '+30 daqiqa',
      timeHour1: '+1 soat',
      timeHour2: '+2 soat',
      timeHour3: '+3 soat',
      zoneVip: 'VIP zona',
      zoneVipSub: '+20% komfort',
      zonePremium: 'Premium zona',
      zonePremiumSub: '+50% komfort',
      continueBtn: "Davom etish {amount} so'm",
      footer: 'Narxlar klubga qarab farq qilishi mumkin.',
    },
  },
  ru: {
    common: {
      currencyUnit: 'сум',
      error: 'Ошибка',
      ok: 'OK',
      retry: 'Повторить',
      cancel: 'Отмена',
      confirm: 'Подтвердить',
      loading: 'Загрузка...',
      comingSoon: 'Скоро',
      permission: {
        locationTitle: 'Доступ к геолокации',
        locationMessage:
          'Чтобы показать ближайшие клубы на карте и подобрать ближайшую точку Nexora, разрешите доступ к местоположению. Данные используются только для отображения локации.',
        cameraTitle: 'Доступ к камере',
        cameraMessage:
          'Для сканирования QR-кода с монитора ПК нужен доступ к камере. Снимки не сохраняются.',
        notificationsTitle: 'Уведомления',
        notificationsMessage:
          'Будем сообщать о подтверждении брони, статусе очереди и акциях. Без спама.',
        allow: 'Разрешить',
        notNow: 'Не сейчас',
        openSettings: 'Открыть настройки',
        deniedTitle: 'Доступ закрыт',
        deniedMessage:
          'Разрешение можно включить в настройках системы. Перейти к настройкам?',
      },
    },
    tabs: {
      home: 'Главная',
      discover: 'Поиск',
      bookings: 'Брони',
      wallet: 'Кошелёк',
      profile: 'Профиль',
      scanQr: 'Сканер',
      scanQrA11y: 'Сканировать QR-код ПК',
    },
    soon: {
      aiAssistant: {
        title: 'AI-ассистент скоро',
        subtitle: 'Искусственный интеллект подберёт клуб, время и игру под вас.',
      },
      aiRecommendations: {
        title: 'AI-рекомендации скоро',
        subtitle: 'AI подберёт лучший клуб и время на основе вашей истории игр.',
      },
      smartSeat: {
        title: 'Smart Seat скоро',
        subtitle: 'AI сам выберет лучшее свободное место — вам останется только подтвердить.',
      },
      smartQueue: {
        title: 'Smart очередь скоро',
        subtitle: 'Встаньте в очередь и получайте уведомление, когда место освободится.',
      },
      walletTopup: {
        title: 'Пополнение скоро',
        subtitle: 'Пока пополнение происходит в клубе. Скоро Payme и Click будут доступны прямо в приложении.',
      },
      sessionInvites: {
        title: 'Игровые приглашения скоро',
        subtitle: 'Приглашайте друзей в активную сессию одним тапом.',
      },
      partyBooking: {
        title: 'Игра с друзьями скоро',
        subtitle: 'Бронируйте несколько мест и играйте с друзьями.',
      },
      rating: {
        title: 'Рейтинг скоро',
        subtitle: 'Следите за своим прогрессом и попадайте в топ игроков клуба.',
      },
      tournaments: {
        title: 'Турниры скоро',
        subtitle: 'Призовые турниры, прямые трансляции и командные игры — всё в пути.',
      },
      bonusPoints: {
        title: 'Бонусные баллы скоро',
        subtitle: 'Система бонусных баллов, миссий и наград готовится к запуску.',
      },
      referEarn: {
        title: 'Пригласи и получи скоро',
        subtitle: 'Приглашайте друзей и получайте бонусные баллы — функция запустится вместе с системой наград.',
      },
      statistics: {
        title: 'Статистика скоро',
        subtitle: 'Сессии, время игры, любимые игры и другая личная статистика — всё в пути.',
      },
      badgeShort: 'Скоро',
    },
    settings: {
      title: 'Настройки',
      account: { title: 'Аккаунт и профиль', subtitle: 'Личные данные, аватар, уровень' },
      preferences: { title: 'Предпочтения', subtitle: 'Игры, клубы, язык и другое' },
      privacy: { title: 'Конфиденциальность', subtitle: 'Пароль, 2FA, настройки приватности' },
      payment: { title: 'Способы оплаты', subtitle: 'Карты и другие способы оплаты' },
      history: { title: 'История транзакций', subtitle: 'Платежи и квитанции' },
      notifications: { title: 'Настройки уведомлений', subtitle: 'Уведомления и напоминания' },
      language: 'Язык',
      about: 'О приложении',
      versionPrefix: 'Версия',
      comingSoon: 'Этот раздел пока недоступен',
      logout: 'Выйти из аккаунта',
      logoutTitle: 'Выход',
      logoutMessage: 'Вы действительно хотите выйти из аккаунта?',
      cancel: 'Отмена',
      confirmLogout: 'Выйти',
    },
    language: {
      title: 'Выберите язык',
      subtitle: 'Язык интерфейса приложения',
    },
    login: {
      titleLine1: 'Рады вашему',
      titleLine2: 'возвращению!',
      subtitle: 'Войдите в систему\nили зарегистрируйтесь.',
      tabs: { signin: 'Вход', signup: 'Регистрация' },
      loginPlaceholder: 'Логин (например: akmal)',
      passwordPlaceholder: 'Пароль',
      passwordConfirmPlaceholder: 'Повторите пароль',
      showPasswordA11y: 'Показать пароль',
      hidePasswordA11y: 'Скрыть пароль',
      continue: 'Войти',
      signupBtn: 'Зарегистрироваться',
      divider: 'или войти через',
      noAccount: 'Нет аккаунта? ',
      haveAccount: 'Уже есть аккаунт? ',
      signupLink: 'Зарегистрироваться',
      signinLink: 'Войти',
      errorLogin: 'Логин 3-64 символа (буквы, цифры, _-.)',
      errorPassword: 'Пароль минимум 3 символа',
      errorPasswordMismatch: 'Пароли не совпадают',
      welcomeToast: 'Добро пожаловать!',
      registeredToast: 'Вы успешно зарегистрировались!',
      socialSoonToast: 'Эта функция скоро появится',
      checkingLabel: 'Проверка...',
    },
    home: {
      greetingMorning: 'Доброе утро',
      greetingDay: 'Добрый день',
      greetingEvening: 'Добрый вечер',
      greetingNight: 'Доброй ночи',
      level: 'Уровень',
      levelDefault: 'Новичок',
      clubsTabs: { mine: 'Мои клубы', all: 'Другие клубы' },
      viewAll: 'Все',
      viewAllRemaining: 'Ещё {n}',
      promotionsTitle: 'Активные акции',
      emptyTitle: 'Вы ещё не присоединились ни к одному клубу',
      emptySub: 'Выберите клуб из списка или присоединитесь по коду.',
      emptyBtn: 'Присоединиться к клубу',
      emptyBrowseAllLink: 'Посмотреть все клубы',
      allEmptyTitle: 'Клубы не найдены',
      allEmptySub: 'Сейчас нет доступных клубов. Загляните позже.',
      otherEmptyTitle: 'Вы добавили все клубы',
      otherEmptySub: 'Чтобы найти новые клубы, перейдите в раздел Поиск.',
      otherEmptyBtn: 'Поиск клубов',
      promoEmptyTitle: 'Активных акций пока нет',
      promoEmptySub: 'Когда клуб запустит акцию, она появится здесь.',
      promoEmptyReload: 'Обновить',
      promoBonusPercent: '+{n}% бонус',
      promoUntil: 'До {date}',
      aiTitle: 'Nexora AI ассистент',
      aiBeta: 'Beta',
      aiDescription: 'Акмал, рекомендуем 3 клуба для вас.',
      aiAction: 'Посмотреть рекомендации',
      guestName: 'Гость',
      openProfileA11y: 'Открыть профиль',
      bellA11y: 'Уведомления',
      bellWithUnreadA11y: '{n} новых уведомлений — открыть',
    },
    discover: {
      cityTashkent: 'Город Ташкент',
      searchPlaceholder: 'Поиск по клубу или району',
      filters: {
        all: 'Все',
        pc: 'PC',
        ps: 'PS зона',
        open: 'Открыты',
        more: 'Фильтр',
      },
      view: { map: 'Карта', list: 'Список' },
      book: 'Забронировать',
      direction: 'Маршрут',
      open24h: 'Открыто · 24 часа',
      open: 'Открыто',
      closed: 'Закрыто',
      emptyTitle: 'Ничего не найдено',
      emptySub: 'Измените фильтр или попробуйте позже.',
      citySheetTitle: 'Выберите город',
      filterSheetTitle: 'Дополнительные фильтры',
      filterRating: 'Рейтинг',
      filterDistance: 'Расстояние',
      filterReset: 'Сбросить',
      filterApply: 'Применить',
      soonBadge: 'Скоро',
      gpsDeniedTitle: 'Геолокация выключена',
      gpsDeniedSub: 'Нажмите, чтобы найти клубы рядом',
      resultsCount: 'Найдено клубов: {n}',
      clearFilters: 'Сбросить фильтры',
      swipeHint: 'Свайпайте влево/вправо для смены клуба',
      directionsShow: 'Маршрут',
      directionsHide: 'Скрыть маршрут',
      directionsLoading: 'Расчёт…',
      directionsNeedGps: 'Сначала включите геолокацию',
      directionsErrorRoute: 'Не удалось построить маршрут, попробуйте ещё раз',
      directionsApprox: 'Показан примерный маршрут',
      directionsApproxHint: 'Приблизительно — по прямой',
      directionsFromYou: 'От вас до {club}',
      recenterA11y: 'Вернуться к местоположению',
      zoomInA11y: 'Приблизить',
      zoomOutA11y: 'Отдалить',
      minutesShort: 'мин',
      hoursShort: 'ч',
      metersShort: 'м',
      kmShort: 'км',
    },
    bookingSuccess: {
      headerStep: '06',
      headerTitle: 'БРОНЬ ПОДТВЕРЖДЕНА',
      title: 'Бронирование успешно!',
      subtitle: 'Место зарезервировано — покажите QR при входе в клуб.',
      bookingId: 'ID брони',
      detailClub: 'Клуб',
      detailTimeFallback: 'Сегодня, время не указано',
      detailZone: 'Зона / Место',
      detailTime: 'Дата и время',
      detailPackage: 'Пакет',
      detailTotal: 'Итого',
      qrHint: 'Покажите QR-код в клубе',
      actionDirection: 'Маршрут',
      actionShare: 'Поделиться',
      actionCalendar: 'В календарь',
      homeBtn: 'На главную',
      copiedToast: 'ID брони скопирован',
      copyIdA11y: 'Скопировать ID брони',
      shareTitle: 'Моя бронь Nexora:',
      directionMissingClub: 'Данные клуба не найдены',
      calendarMissingTime: 'Время не указано',
      calendarTitlePrefix: 'Nexora бронь —',
    },
    timeSelect: {
      headerStep: '04',
      headerTitle: 'ВРЕМЯ И ПАКЕТ',
      title: 'Выберите время и пакет',
      tabPackages: 'Пакеты',
      tabHourly: 'Почасовая',
      pkgHourly: 'Почасовая',
      pkgHourlySub: '1 час',
      pkg3Hour: 'Пакет на 3 часа',
      pkg3HourSub: '3 часа',
      pkgNight: 'Ночной пакет',
      pkgNightSub: '22:00 - 08:00',
      pkgPremium: 'Премиум на день',
      pkgPremiumSub: 'Безлимитная игра весь день',
      timeLabel: 'Выберите время',
      todayLabel: 'Сегодня, 12 мая',
      continue: 'Продолжить',
      hoursSuffix: 'час',
      noPackagesTitle: 'Пакеты не настроены',
      noPackagesSub: 'В этом клубе ещё нет пакетов. Забронируйте почасово.',
      noSlotsSub: 'На этот день нет свободного времени. Загляните завтра.',
      peakLabel: 'Высокий спрос',
      peakHint: 'Это время высокого спроса. Цена пакета не меняется, но клуб может быть загружен.',
    },
    payment: {
      headerStep: '05',
      headerTitle: 'ОПЛАТА',
      title: 'Проверьте заказ',
      summaryZone: 'PC зона',
      summarySeat: 'Место {seat}',
      summaryHourly: 'Почасовой',
      summaryTime: '12 мая, 12:00 - 13:00',
      promoLabel: 'Промокод',
      promoPlaceholder: 'Введите код',
      promoApply: 'Применить',
      subtotal: 'Промежуточно',
      serviceFee: 'Сервисный сбор',
      total: 'Итого',
      methodLabel: 'Способ оплаты',
      methodClubBalance: 'Баланс клуба',
      methodClubBalanceSub: '{name} · {balance}',
      methodPayme: 'Payme',
      methodPaymeSub: 'Мобильная оплата',
      methodClick: 'Click',
      methodClickSub: 'Мобильная оплата',
      noMethodsTitle: 'Недостаточно средств',
      noMethodsSub: 'Пополнение через приложение пока недоступно. Пополните баланс в кассе клуба.',
      confirmBtn: 'Подтвердить оплату',
      secure: 'Ваша оплата защищена',
      errorSeatMissing: 'Сначала выберите место',
      errorSeatUnavailable: 'Выбранное место не найдено. Пожалуйста, выберите снова.',
      errorSeatTaken: 'Это место уже занято. Выберите другое.',
      errorInsufficientBalance: 'Недостаточно средств на балансе',
      errorInsufficientBalanceDetail: 'Нужно ещё {amount} {unit}. Пополните в клубе.',
      rolledToTomorrowWarning: 'Время уже прошло — бронь на завтра в {time}.',
    },
    seatSelect: {
      headerStep: '03',
      headerTitle: 'ВЫБОР МЕСТА',
      pickSeat: 'Выберите своё место',
      legendAvailable: 'Свободно',
      legendTaken: 'Занято',
      legendSelected: 'Ваш выбор',
      rowLabel: 'Ряд {letter}',
      screenLabel: 'ЭКРАН',
      selectedLabel: 'Выбрано: ',
      continue: 'Продолжить',
      takenToast: 'Это место занято',
      perHourSuffix: 'час',
      allTakenTitle: 'Все места заняты',
      allTakenSub: 'Сейчас нет свободных мест. Попробуйте другую зону.',
      noLayoutTitle: 'Расстановка мест не настроена',
      noLayoutSub: 'В этом клубе ещё нет планировки зоны. Свяжитесь с оператором.',
    },
    zoneSelect: {
      headerStep: '02',
      headerTitle: 'ВЫБОР ЗОНЫ',
      title: 'Выберите зону',
      subtitle: 'Подходящую вам зону',
      pcZone: 'PC зона',
      pcZoneDesc: 'Производительные ПК и удобные кресла',
      vipZone: 'VIP компьютеры',
      vipZoneDesc: 'Премиум-оборудование для соревнующихся',
      psZone: 'PS5 комнаты',
      psZoneDesc: 'Консоли PS5 и большие экраны',
      seatUnit: 'мест',
      roomUnit: 'комнат',
      available: 'Доступно: {n} {unit}',
      full: 'Свободных мест нет',
      pricePerHour: '{price} в час',
      priceAtClub: 'Цена в клубе',
      recommended: 'Рекомендуем',
      realtimeTitle: 'Обновляется в реальном времени',
      realtimeSub: 'Доступность отображается в реальном времени.',
      emptyTitle: 'Нет доступных зон',
      emptySub: 'Все зоны сейчас закрыты или заняты.',
    },
    clubDetails: {
      reviewCount: '({n} отзывов)',
      open24h: 'Открыто · 24 часа',
      open: 'Открыто',
      closed: 'Закрыто',
      feature1: 'Мощные\nПК',
      feature2: 'PS5\nзоны',
      feature3: 'Быстрый\nинтернет',
      feature4: 'Премиум\nуровень',
      galleryTitle: 'Фотографии клуба',
      galleryViewAll: 'Все фото',
      galleryCounter: '{current} / {total}',
      galleryCloseA11y: 'Закрыть галерею',
      reviewsLink: 'Посмотреть отзывы',
      direction: 'Маршрут',
      book: 'Забронировать',
      favoriteAdded: 'Добавлено в избранное',
      favoriteRemoved: 'Удалено из избранного',
      favoriteToggleA11y: 'Добавить в избранное',
      shareA11y: 'Поделиться клубом',
      shareError: 'Не удалось поделиться',
      showMore: 'Подробнее',
      showLess: 'Свернуть',
      shareMessage: 'Посмотрите клуб {name} в приложении Nexora!',
      notFoundTitle: 'Клуб не найден',
      notFoundSub: 'Этот клуб не существует или удалён.',
      notFoundBtn: 'Назад',
      addressUnknown: 'Адрес не указан',
      loading: 'Загрузка...',
      notJoinedTitle: 'Сначала присоединитесь',
      notJoinedMessage: 'Чтобы забронировать в этом клубе, нужно сначала стать его участником.',
      notJoinedConfirm: 'Присоединиться',
      switchingClubToast: 'Подключение к клубу...',
      promotionsTitle: 'Акции клуба',
      promotionsEmpty: 'Пока в этом клубе нет активных акций.',
    },
    walletTopup: {
      headerTitle: 'Пополнить счёт',
      amountLabel: 'Введите сумму',
      amountUnit: 'сум',
      methodLabel: 'Способ оплаты',
      methodPayme: 'Payme',
      methodClick: 'Click',
      methodFee: 'Комиссия 0%',
      payBtn: 'Оплатить {amount} сум',
      secure: 'Безопасная оплата',
      successToast: 'Счёт успешно пополнен!',
      errorTitle: 'Ошибка',
      errorOpenUrl: 'Не удалось открыть платёжную систему. Проверьте, что браузер работает.',
    },
    clubJoin: {
      headerTitle: 'Присоединиться к клубу',
      title: 'Введите код клуба',
      subtitle: 'Введите пригласительный код от администратора\nили отсканируйте QR.',
      placeholder: 'Например: NEXORA-2024',
      qrAlt: 'Войти через QR-код',
      helpTitle: 'Где взять код?',
      helpText: '• Спросите у администратора клуба\n• На QR-коде у кассы\n• Друг мог отправить вам приглашение',
      joinBtn: 'Присоединиться',
      errorEmpty: 'Введите код клуба',
      successToast: 'Вы присоединились к клубу!',
      passwordLabel: 'Пароль клуба',
      passwordPlaceholder: 'Минимум {n} символов',
      passwordHint: 'Этот пароль относится только к данному клубу — будет использоваться для будущих входов. Минимум {n} символов.',
      errorPasswordTooShort: 'Пароль должен быть не короче {n} символов',
      passwordShow: 'Показать пароль',
      passwordHide: 'Скрыть пароль',
      scannedFillPasswordHint: 'Код заполнен — теперь введите пароль',
    },
    clubPreviewScreen: {
      headerTitle: 'О клубе',
      joinBtn: 'Присоединиться к клубу',
    },
    profileEdit: {
      headerTitle: 'Редактировать профиль',
      changeAvatar: 'Сменить аватар',
      changeAvatarHint: 'Нажмите, чтобы выбрать фото из галереи',
      firstName: 'Имя',
      lastName: 'Фамилия',
      login: 'Логин',
      phone: 'Номер телефона',
      phonePlaceholder: '+998 90 123 45 67',
      phoneHint: 'Клуб сможет связаться с вами по этому номеру',
      phoneTooLong: 'Номер телефона слишком длинный',
      nameTooLong: 'Имя или фамилия слишком длинные (макс. 64 символа)',
      email: 'Email',
      avatarUrlLabel: 'Ссылка на аватар',
      saveBtn: 'Сохранить',
      successToast: 'Профиль обновлён',
      avatarUploadingHint: 'Загрузка…',
      avatarUploadedToast: 'Аватар обновлён',
      avatarUploadFailed: 'Не удалось загрузить аватар, попробуйте ещё раз',
      galleryDenied: 'Доступ к галерее не разрешён',
      avatarTooLarge: 'Фото слишком большое. Максимум 5 МБ',
      avatarTooLargeWithSize: 'Фото слишком большое ({size} МБ). Максимум {max} МБ',
      avatarBadDimensions: 'Неподходящий размер фото. Не меньше 64×64 и не больше 2000×2000 пикселей',
      avatarTooSmallWithDims: 'Фото слишком маленькое. Нужно минимум {min}×{min} пикселей',
      avatarTooBigDimsWithDims: 'Фото слишком большое по размеру. Максимум {max}×{max} пикселей',
      avatarBadFormat: 'Этот формат не поддерживается. Загрузите JPG, PNG или WEBP (если HEIC, сконвертируйте в JPG)',
      avatarNetworkError: 'Нет соединения с интернетом. Проверьте Wi-Fi или мобильную сеть',
      avatarServerError: 'Ошибка на сервере. Попробуйте чуть позже',
    },
    writeReview: {
      headerTitle: 'Написать отзыв',
      rateLabel: 'Оцените клуб',
      rate1: 'Плохо',
      rate2: 'Так себе',
      rate3: 'Средне',
      rate4: 'Хорошо',
      rate5: 'Отлично',
      pickClub: 'Выберите клуб',
      commentLabel: 'Ваш отзыв',
      commentPlaceholder: 'Расскажите о вашем опыте...',
      submitBtn: 'Отправить',
      successToast: 'Отзыв принят',
      errorMissing: 'Заполните рейтинг и текст отзыва',
      atmosphereLabel: 'Атмосфера',
      cleanlinessLabel: 'Чистота',
      technicalLabel: 'Техническое состояние',
      peripheralsLabel: 'Аксессуары',
    },
    myReviews: {
      headerTitle: 'Мои отзывы',
      countLabel: 'Вы оставили {n} отзывов',
      emptyTitle: 'Отзывов пока нет',
      emptySub: 'Поделитесь впечатлениями после посещения клуба — это поможет другим игрокам.',
      technicalLabel: 'Техника',
      peripheralsLabel: 'Аксессуары',
      unknownClub: 'Клуб',
    },
    achievements: {
      headerTitle: 'Достижения',
      tabBadges: 'Значки',
      tabCollected: 'Собрано',
      tabStats: 'Статистика',
      progress: 'Прогресс',
      earned: 'Получено',
      locked: 'Закрыто',
      statTotalScore: 'Общий счёт',
      statTrophies: 'Значки',
      statWins: 'Победы',
      statRank: 'Рейтинг',
      sectionFeatured: 'Последняя награда',
      viewBtn: 'Посмотреть награду',
      xpLabel: 'Очки достижений',
      badgesSection: 'Достижения',
      badgeCount: '38 / 56',
      seasonRewards: 'Сезонные награды',
      seasonName: 'Сезон 5',
      seasonEnds: 'До конца сезона: 18 дней',
      badge1Title: 'Победитель турнира',
      badge1Sub: '5 раз',
      badge2Title: 'Серия побед',
      badge2Sub: '10 побед',
      badge3Title: 'Лучший',
      badge3Sub: 'MVP 25 раз',
      badge4Title: 'Лидер команды',
      badge4Sub: '50 игр',
      badge5Title: 'Серебряная медаль',
      badge5Sub: '2-е место × 2',
      badge6Title: 'Бронзовая медаль',
      badge6Sub: '3-е место × 3',
      soonTitle: 'Достижения скоро',
      soonSubtitle: 'Система достижений в разработке. Скоро вы будете получать значки и награды за свою игру.',
      soonBadge: 'Скоро',
    },
    smartQueue: {
      headerTitle: 'Smart очередь',
      title: 'Дождитесь свободного\nместа',
      subtitle: 'AI найдёт самое быстрое место',
      noQueueTitle: 'Вы пока не в очереди',
      noQueueSub: 'Нажмите кнопку ниже, чтобы встать в очередь',
      activeTitle: 'Ваша очередь',
      yourPosition: 'Ваше место',
      estimatedWait: 'Ожидание',
      estimatedMinutes: '~{n} мин',
      pcCode: 'PC: {code}',
      leaveBtn: 'Покинуть очередь',
      joinBtn: 'Встать в очередь',
      minutes: '{n} мин',
      successJoined: 'Вы в очереди',
      successLeft: 'Вы покинули очередь',
    },
    smartSeat: {
      headerTitle: 'Smart Seat',
      title: 'AI порекомендует\nлучшее место',
      subtitle: 'Анализируем ваш прошлый опыт',
      aiTag: 'AI рекомендация',
      reasonLabel: 'Почему это место?',
      pcLabel: 'Рекомендуемый PC',
      statusFree: 'Свободно',
      holdBtn: 'Забронировать место',
      successHeld: 'Место забронировано',
    },
    teamFinder: {
      headerTitle: 'Поиск команды',
      title: 'Найдите игроков\nи соберите команду',
      gameDropdown: 'Игра',
      skillDropdown: 'Уровень',
      micToggle: 'С микрофоном',
      sectionPlayers: 'Игроки',
      sectionTeams: 'Активные команды',
      inviteBtn: 'Пригласить',
      joinBtn: 'Вступить',
      createBtn: 'Создать команду',
      cancelBtn: 'Отмена',
      emptyPlayers: 'По этой игре игроков не найдено',
      invitePickerTitle: 'В какую команду пригласить {name}?',
      invitedToast: 'Приглашение отправлено',
      createdToast: 'Команда создана',
      noTeamHint: 'Сначала создайте команду, затем добавляйте игроков',
      createSectionName: 'Название команды',
      createPlaceholder: 'Например: Nexora Stars',
      createHelperGame: 'Команда будет создана для {game}',
      statusOnline: 'Онлайн',
      statusInGame: 'В игре',
      statusOffline: 'Не в сети',
      invitesTitle: 'Новые приглашения · {n}',
      inviteAccept: 'Принять',
      inviteDecline: 'Отклонить',
      inviteAcceptedToast: 'Вы вступили в команду «{name}»',
      inviteDeclinedToast: 'Приглашение отклонено',
      unknownTeam: 'Команда',
      inviteSlotsLabel: '{n} мест',
      stubHint: 'Участник клуба',
      gameSheetTitle: 'Выберите игру',
      myTeamsTitle: 'Мои команды · {n}',
    },
    clubReviewsList: {
      headerTitle: 'Отзывы',
      avgLabel: 'Средний рейтинг',
      writeBtn: 'Написать отзыв',
      sectionRecent: 'Последние отзывы',
      writeDisabledIn: 'Следующий отзыв через {n} ч.',
    },
    clubsSwitch: {
      headerTitle: 'Мои клубы',
      sectionMine: 'Мои клубы',
      activeBadge: 'Активен',
      addBtn: 'Добавить новый клуб',
      leaveConfirmTitle: 'Выйти из клуба',
      leaveConfirmMessage: 'Вы действительно хотите выйти из этого клуба?',
      leaveBtn: 'Выйти',
      cancelBtn: 'Отмена',
      leftToast: 'Вы вышли из клуба',
      activatedToast: 'Клуб активирован',
    },
    rewardsStore: {
      headerTitle: 'Магазин наград',
      myPoints: 'Мои баллы',
      points: 'баллов',
      tabAll: 'Все',
      tabGames: 'Игры',
      tabFood: 'Еда',
      tabVip: 'VIP',
      tabPromos: 'Акции',
      historyBtn: 'Моя история',
      cost: '{n} баллов',
      reward1Title: '1 час бесплатной игры',
      reward1Sub: 'В любом клубе',
      reward2Title: 'Снек-сет ваучер',
      reward2Sub: 'Напиток + Снек',
      reward3Title: 'VIP комната, 1 час',
      reward3Sub: 'Премиум комната',
      reward4Title: 'Участие в турнире',
      reward4Sub: 'Билет на турнир',
      reward5Title: 'Купон 10% скидки',
      reward5Sub: 'На любую услугу',
      reward6Title: 'Купон 20% скидки',
      reward6Sub: 'На любую услугу',
    },
    notifications: {
      headerTitle: 'Уведомления',
      tabAll: 'Все',
      tabBookings: 'Брони',
      tabTournaments: 'Турниры',
      tabOffers: 'Акции',
      tabSystem: 'Система',
      emptyTitle: 'Нет уведомлений',
      emptySub: 'Новые уведомления появятся здесь.',
      markAllRead: 'Отметить все прочитанным',
      clearAll: 'Очистить все',
      clearAllA11y: 'Очистить уведомления',
      clearAllConfirmTitle: 'Очистить все?',
      clearAllConfirmMessage: 'Все уведомления будут удалены. Это действие нельзя отменить.',
      clearAllConfirm: 'Очистить',
      clearAllCancel: 'Отмена',
      clearAllToast: 'Уведомления очищены',
      timeMinutes: '{n} мин назад',
      timeHours: '{n} ч назад',
      timeNow: 'Только что',
      settingsA11y: 'Настройки уведомлений',
      n1Title: 'Бронь подтверждена',
      n1Desc: 'Бронь Nexora Arena Koramangala на 24 мая, 18:00 подтверждена.',
      n1Time: '2 минуты назад',
      n2Title: 'Напоминание о турнире',
      n2Desc: 'Турнир Dota 2 Night Cup начнётся завтра в 20:00.',
      n2Time: '15 минут назад',
      n3Title: 'Открыта акция!',
      n3Desc: 'Купон 20% скидки активен. Действителен до конца дня.',
      n3Time: '1 час назад',
      n4Title: 'AI рекомендация',
      n4Desc: 'Для вас рекомендована новая AI Arena зона. Попробуйте!',
      n4Time: '2 часа назад',
      n5Title: 'Системное сообщение',
      n5Desc: 'Доступно обновление приложения. Не забудьте обновить.',
      n5Time: '5 часов назад',
    },
    sessionInvites: {
      headerTitle: 'Игровые приглашения',
      subtitle: 'Приглашения на совместную игру от друзей',
      emptyTitle: 'Пока нет приглашений',
      emptySub: 'Никто не отправил вам игровое приглашение',
      inviteFromTitle: '{name} приглашает вас',
      pcLabel: 'PC: {code}',
      accept: 'Принять',
      reject: 'Отклонить',
      acceptedToast: 'Приглашение принято',
      rejectedToast: 'Отклонено',
    },
    bookingExit: {
      title: 'Выйти из бронирования',
      message: 'Вы хотите выйти из бронирования? Ваши выборы не сохранятся.',
      cancel: 'Продолжить',
      confirm: 'Выйти',
    },
    walletScreen: {
      pickerTitle: 'Выберите клуб',
      pickerSub: 'Кошелёк привязан к балансу клуба',
      noClubs: 'Вы не состоите ни в одном клубе',
      joinClubBtn: 'Присоединиться к клубу',
      emptyTitle: 'Клуб не выбран',
      emptyDesc: 'Кошелёк отдельный для каждого клуба. Выберите клуб, чтобы увидеть баланс.',
      emptyPickBtn: 'Выбрать клуб',
      emptyJoinLink: 'Присоединиться к новому клубу',
      clubLabel: 'Клуб:',
      balanceLabel: 'Баланс в клубе',
      statCashback: 'Кэшбэк',
      statTodayCashback: 'Кэшбэк сегодня',
      cardsTitle: 'Мои карты',
      cardsAction: 'Все карты',
      cardMain: 'Основная карта',
      quickTopup: 'Быстрое пополнение',
      topupBtn: 'Пополнить',
      pointsLabel: 'баллов',
      balanceShort: 'Баланс',
      liveLabel: 'LIVE',
      bonusLabel: 'Бонус',
      paymentMethodsTitle: 'Способы оплаты',
      paymentMethodA11y: 'Оплатить через {name}',
      paymeSub: 'Карта или банк',
      clickSub: 'Быстрые платежи',
    },
    components: {
      breadcrumbZone: 'Зона',
      breadcrumbSeat: 'Место',
      breadcrumbTime: 'Время',
      breadcrumbPay: 'Оплата',
      clubOpen: 'Открыто',
      clubClosed: 'Закрыто',
      clubPsZones: 'PS зона',
      club24h: '24/7 открыт',
      clubVerified: '✓ Проверен',
      clubSoonDetails: 'Подробности скоро',
      walletBalanceLabel: 'Ваш баланс',
      walletPointsLabel: 'баллов',
      membershipBalance: 'Баланс в клубе',
      membershipTopup: 'Пополнить',
      countdownLabel: 'До начала',
      unitHours: 'ч',
      unitMinutes: 'мин',
      unitSeconds: 'сек',
      qaBook: 'Бронь',
      qaPs: 'PS зона',
      qaTournaments: 'Турниры',
      qaTopup: 'Пополнить',
      webMapTitle: 'Карта в мобильном',
      webMapSub: 'Откройте приложение на телефоне, чтобы увидеть реальную карту.',
    },
    clubsList: {
      headerTitle: 'Клубы',
      tabMine: 'Мои клубы',
      tabAll: 'Другие клубы',
      emptyTitle: 'Вы ещё не присоединились ни к одному клубу',
      emptySub: 'Выберите клуб из списка или присоединитесь по коду.',
      joinBtn: 'Присоединиться к клубу',
    },
    promotionsList: {
      headerTitle: 'Активные акции',
      emptyTitle: 'Активных акций пока нет',
      emptySub: 'Когда клубы запустят новые акции, они появятся здесь.',
    },
    rewardsCenter: {
      headerTitle: 'Мои награды',
      totalLabel: 'Всего баллов',
      levelLabel: 'Ваш уровень',
      levelName: 'NEXORA PRO',
      levelInfo: 'Уровень 12',
      streakLabel: 'Дневная серия',
      streakDays: '{n} дн',
      streakSub: 'Продолжайте и выигрывайте больше!',
      activeMissions: 'Активные миссии',
      viewAll: 'Все',
      recentAchievements: 'Последние достижения',
      claimBtn: 'Забрать',
      claimingBtn: '...',
    },
    tournaments: {
      headerTitle: 'Турниры',
      statusAll: 'Все',
      statusLive: 'Сейчас',
      statusUpcoming: 'Предстоящие',
      statusFinished: 'Завершённые',
      sectionFeatured: 'Рекомендуем',
      sectionUpcoming: 'Предстоящие турниры',
      liveBadge: 'LIVE',
      registrationEndsIn: 'Регистрация до',
      teamsCount: 'команд',
      registerBtn: 'Зарегистрироваться',
      emptyList: 'По этому фильтру турниров нет',
    },
    tournamentDetails: {
      headerTitle: 'Детали турнира',
      liveBadge: 'LIVE',
      prizeLabel: 'Общий призовой фонд',
      statRegistrationEnds: 'Регистрация до',
      statStart: 'Начало',
      statTeams: 'Команды',
      statFormat: 'Формат турнира',
      statServer: 'Сервер',
      tabDetails: 'Детали',
      tabSchedule: 'Расписание',
      tabParticipants: 'Участники',
      tabRules: 'Правила',
      aboutTitle: 'О турнире',
      aboutDesc: 'Открытый турнир по CS2. Лучшие команды борются за призовой фонд 1 500 000 сум!',
      prizesTitle: 'Распределение призов',
      prize1: '1 место',
      prize2: '2 место',
      prize3: '3 место',
      prize4: '4 место',
      registerBtn: 'Зарегистрироваться',
      registeredBtn: 'Вы зарегистрированы',
      waitlistBtn: 'Вы в листе ожидания',
      toastRegistered: 'Вы успешно зарегистрированы на турнир!',
      toastWaitlist: 'Места заполнены — вы в листе ожидания',
      notFound: 'Турнир не найден',
      teamsRegistered: 'команд зарегистрировано',
      shareA11y: 'Поделиться турниром',
      scheduleSoon: 'Расписание скоро\nСразу после старта турнира матчи появятся здесь',
      participantsSoon: 'Список участников скоро\nЗарегистрированные команды появятся здесь',
    },
    friends: {
      headerTitle: 'Друзья',
      tabMine: 'Мои друзья',
      tabSearch: 'Поиск',
      sectionMine: 'Мои друзья ({n})',
      pendingTitle: '{n} новых заявок',
      pendingSub: 'Нажмите, чтобы посмотреть',
      searchPlaceholder: 'Поиск по логину или имени...',
      searchEmptyTitle: 'Найдите пользователя',
      searchEmptySub: 'Введите логин или имя и нажмите Enter',
      foundCount: 'Найдено: {n}',
      addBtn: 'Добавить в друзья',
      removeBtn: 'Удалить',
      emptyTitle: 'Пока нет друзей',
      emptySub: 'Найдите других игроков на вкладке «Поиск» и добавляйте в друзья',
      sentToast: 'Заявка в друзья отправлена',
      removedToast: 'Удалено из друзей',
      searchPromptTitle: 'Найдите пользователя',
      searchPromptSub: 'Введите логин или имя и нажмите кнопку поиска',
      outgoingTitle: 'Отправленные заявки · {n}',
      cancelBtn: 'Отменить',
      cancelledToast: 'Заявка отменена',
      removeConfirmTitle: 'Удалить из друзей?',
      removeConfirmMessage: 'Дружба с {name} будет прекращена.',
      removeConfirmYes: 'Удалить',
      removeConfirmNo: 'Отмена',
      alreadyFriendsBadge: 'Друг',
      blockedBadge: 'Заблокирован',
    },
    friendRequests: {
      headerTitle: 'Заявки',
      subtitle: 'Заявки в друзья, отправленные вам',
      emptyTitle: 'Нет заявок',
      emptySub: 'Никто не отправлял вам заявку в друзья',
      accept: 'Принять',
      reject: 'Отклонить',
      acceptedToast: 'Добавлено в друзья',
      rejectedToast: 'Заявка отклонена',
    },
    favorites: {
      headerTitle: 'Избранное',
      headerAction: 'Все',
      sectionFav: 'Любимые клубы',
      sectionRebook: 'Быстрая повторная бронь',
      rebookBtn: 'Забронировать',
      lastBooked: 'Последняя бронь: {date}',
      metaPc: 'PC зона',
      metaPs: 'PS зона',
      emptyTitle: 'Нет избранных клубов',
      emptySub: 'Нажмите ❤ на странице клуба — он появится здесь.',
      discoverBtn: 'Найти клубы',
      countLabel: '{n} сохранено',
      removedToast: '{name} удалён из избранного',
      clearAllAction: 'Очистить',
      clearAllTitle: 'Очистить всё?',
      clearAllMessage: 'Из избранного будут удалены {n} клубов. Действие необратимо.',
      clearAllConfirm: 'Очистить',
      clearAllCancel: 'Отмена',
      clearedToast: 'Избранное очищено',
      fallbackName: 'Клуб',
    },
    aiAssistant: {
      name: 'Nexora AI',
      role: 'AI ассистент',
      greeting: 'Привет, Акмал! Чем могу помочь сегодня?',
      sectionTips: 'Умные подсказки для вас',
      sectionHelp: 'Чем помочь?',
      tip1: 'Вы обычно играете вечером. С 21:00 до 00:00 клубы свободнее, а бонусы выше.',
      tip2: 'В 2 ближайших клубах скидка 20%.',
      tip3: 'Игра в команде даёт больше очков и шанс на призы.',
      chip1: 'Ближайшие клубы',
      chip2: 'Лучшее время',
      chip3: 'Бонусы и акции',
      chip4: 'Найти команду',
      inputPlaceholder: 'Введите сообщение...',
    },
    helpSupport: {
      headerTitle: 'Помощь и поддержка',
      aiTitle: 'Помощник Nexora',
      aiSubtitle: 'Есть вопросы?\nМы готовы помочь!',
      searchPlaceholder: 'Введите ваш вопрос...',
      quickActions: 'Быстрые действия',
      actionChat: 'Живой чат',
      actionChatSub: 'Чат с оператором',
      actionCall: 'Позвонить',
      actionCallSub: 'Центр поддержки',
      actionSubmit: 'Отправить запрос',
      actionSubmitSub: 'Отправьте свой запрос',
      actionRemote: 'Удалённая помощь',
      actionRemoteSub: 'Получить удалённую помощь',
      popularTopics: 'Часто задаваемые вопросы',
      topic1: 'Изменить / отменить бронь',
      topic2: 'Оплата и возврат',
      topic3: 'Баллы и программа лояльности',
      viewAll: 'Все',
      topicsEmpty: 'Вопросов и ответов пока нет.',
      topicsLoading: 'Загрузка...',
      stillNeedHelp: 'Не нашли ответ? Свяжитесь с нами через каналы ниже.',
      ticketSubtitle: 'Опишите проблему подробнее',
      ticketSubject: 'Тема',
      ticketSubjectPlaceholder: 'Например: Проблема с оплатой',
      ticketMessage: 'Сообщение',
      ticketMessagePlaceholder: 'Опишите проблему подробно...',
      ticketSendBtn: 'Отправить',
      ticketSuccess: 'Запрос отправлен. Мы скоро ответим.',
      ticketErrorEmpty: 'Сообщение не может быть пустым',
    },
    teamChat: {
      tabChat: 'Чат',
      tabMembers: 'Участники',
      tabSettings: 'Настройки',
      voiceLabel: 'Голосовой канал',
      voiceLobby: 'Lobby',
      joinVoice: 'Присоединиться к войсу',
      joinedVoice: 'r3v0lt присоединился к голосовому каналу · 20:25',
      inputPlaceholder: 'Введите сообщение...',
      me: 'Вы',
      emptyChat: 'Пока нет сообщений. Напишите первым.',
      membersSoon: 'Панель участников скоро\nЗдесь будут участники команды, роли и ELO',
      settingsSoon: 'Настройки команды скоро\nЗдесь будут имя, лого, правила и разрешения',
      you: 'вы',
      roleOwner: 'Капитан',
      roleInvited: 'Приглашён',
      membersEmpty: 'Участники не найдены',
      menuA11y: 'Действия с командой',
      leaveAction: 'Выйти из команды',
      disbandAction: 'Распустить команду',
      leaveConfirmTitle: 'Выйти из команды?',
      leaveConfirmMessage: 'Вы больше не сможете писать в этом чате и не будете получать сообщения.',
      leaveConfirmYes: 'Выйти',
      leaveConfirmNo: 'Отмена',
      leftToast: 'Вы вышли из команды',
      disbandConfirmTitle: 'Распустить команду?',
      disbandConfirmMessage: 'Это действие необратимо. Все участники и сообщения будут удалены.',
      disbandConfirmYes: 'Распустить',
      disbandConfirmNo: 'Отмена',
      disbandedToast: 'Команда распущена',
    },
    partyBooking: {
      headerTitle: 'Игра с друзьями',
      title: 'Бронируйте\nвместе с друзьями',
      subtitle: 'Выберите места и пригласите друзей — играйте все вместе',
      step1: '1. Выберите свободные места ({selected}/{total})',
      step2: '2. Пригласите друзей ({selected}/{total})',
      noFreeSeats: 'Сейчас нет свободных мест',
      noFriends: 'У вас пока нет друзей',
      findFriends: 'Найти друзей →',
      bookCta: 'Бронь {pcs} мест + {friends} друзей',
      errorTitle: 'Ошибка',
      errorMin1Pc: 'Выберите хотя бы один ПК',
      successTitle: 'Готово!',
      successMessage: 'Места забронированы, друзьям отправлены приглашения',
      partialInvitesMessage: 'Места забронированы, но {n} приглашений не отправлено',
    },
    smartRec: {
      headerTitle: 'Рекомендации',
      title: 'Подобрано\nдля вас',
      aiTag: 'AI рекомендация',
      bestClubs: 'Лучшие клубы',
      bestZones: 'Лучшие зоны',
      bestTimes: 'Лучшие интервалы',
      viewAll: 'Все',
      today: 'Сегодня',
      zonePs: 'PS зона',
      zonePsMeta: 'Высокая производительность · Свободно',
      zoneVip: 'VIP комната',
      zoneVipMeta: 'Высокий комфорт · Мало занято',
      zoneVr: 'VR зона',
      zoneVrMeta: 'Самый иммерсивный опыт',
      timeGoodLoad: 'Хорошая загрузка',
      timeMostPopular: 'Самое популярное',
      timeLowLoad: 'Низкая загрузка',
      emptyClubs: 'AI пока не подобрал рекомендации — загляните позже',
    },
    rating: {
      headerTitle: 'Рейтинг',
      scopeGlobal: 'Глобально',
      scopeRegion: 'Регион',
      scopeFriends: 'Друзья',
      filterTop: 'Топ 100',
      filterSeason: 'Сезон 5',
      columnPlayer: 'Игрок',
      columnRating: 'Рейтинг',
      you: 'Вы (NexoraWolf)',
      footer: 'Рейтинг обновляется каждые 24 часа',
    },
    referEarn: {
      headerTitle: 'Пригласите друзей',
      title: 'Приглашайте друзей,\nполучайте награды!',
      codeLabel: 'Ваш реферальный код',
      linkLabel: 'Поделитесь реферальной ссылкой',
      howItWorks: 'Как это работает?',
      step1: 'Друг регистрируется по вашему коду',
      step2: 'Он играет в первый раз',
      step3: 'Вы оба получаете награду',
      yourReferrals: 'Ваши приглашённые',
      statInvites: 'Приглашений',
      statActive: 'Активные друзья',
      statPoints: 'Заработано баллов',
      milestones: 'Награды за этапы',
      milestone5: 'Пригласите 5 друзей',
      milestone10: 'Пригласите 10 друзей',
      milestone20: 'Пригласите 20 друзей',
      received: 'Получено',
      milestoneTemplate: 'Пригласи {n} друзей',
      copiedToast: 'Код скопирован',
      shareMessage: 'Моя ссылка для регистрации в Nexora:',
      copyCodeA11y: 'Скопировать код',
      shareLinkA11y: 'Поделиться ссылкой',
    },
    statistics: {
      headerTitle: 'Статистика',
      title: 'Моя статистика',
      proBadge: 'NEXORA PRO',
      levelLabel: 'Уровень {n}',
      overall: 'Общие показатели',
      viewAll: 'Все',
      statHours: 'Часы игры',
      statSessions: 'Сессии',
      statFavoriteClubs: 'Любимые клубы',
      statTotalSpent: 'Всего потрачено',
      statFavoriteGames: 'Любимые игры',
      statAvgRating: 'Средний рейтинг',
      valueHours: '{n} ч',
      valueSessions: '{n} раз',
      valueClubs: '{n} шт',
      aiInsight: 'AI инсайт',
      insightLine1: 'Вы любите стратегические игры и активны вечером.',
      insightLine2: 'Для вас оптимальны клубы 20:00–23:00 и командные режимы.',
    },
    onboarding: {
      skip: 'Пропустить',
      page1Tagline1: 'Твоя игра. Твоя арена.',
      page1Tagline2: 'Победа. Всегда. Везде.',
      page1Footer1: 'Создано для чемпионов.',
      page1Footer2: 'Мощь для геймеров.',
      page2TitlePart1: 'Лучшие\n',
      page2TitleAccent: 'клубы',
      page2TitlePart2: '\nрядом с вами',
      page2Subtitle: 'Топовые клубы, PS-зоны,\nтурниры и крутая атмосфера\nуже ждут вас.',
      page3TitlePart1: 'Бронируй.\n',
      page3TitleAccent1: 'Пополняй. ',
      page3TitleAccent2: 'Играй.',
      page3Subtitle: 'Бронируйте ПК, пополняйте баланс\nи погружайтесь в мир игр.\nНе пропустите ничего.',
      page3Feat1Title: 'Компьютеры',
      page3Feat1Sub: 'Высокая производительность',
      page3Feat2Title: 'PS зона',
      page3Feat2Sub: 'С нужным оборудованием',
      page3Feat3Title: 'Пополнение',
      page3Feat3Sub: 'Быстро и безопасно',
    },
    services: {
      headerTitle: 'Сервисы',
      yourSession: 'Ваша сессия',
      activeBadge: 'Активна',
      balanceLabel: 'Остаток баланса',
      sectionTitle: 'Запросы и помощь',
      staffTitle: 'Позвать сотрудника',
      staffSub: 'Сотрудник подойдёт к столу',
      issueTitle: 'Сообщить о проблеме',
      issueSub: 'Технический сбой или жалоба',
      supportTitle: 'Поддержка',
      supportSub: 'Центр помощи и техподдержка',
      staffDefaultMsg: 'Нужна помощь',
      issueDefaultMsg: 'Технический сбой',
      staffSentToast: 'Сотрудник вызван, ожидайте',
      issueSentToast: 'Проблема принята',
    },
    qrScan: {
      headerTitle: 'QR вход',
      subtitle: 'Отсканируйте QR на стикере компьютера — сессия начнётся сразу.',
      orCode: 'Или введите код',
      actionFlash: 'Вспышка',
      actionGallery: 'Из галереи',
      guide: 'Как работает QR?',
      invalidFormat: 'Неверный формат QR. Пример: 42:abc123',
      scanCta: 'Сканировать камерой',
      cameraPermTitle: 'Нужен доступ к камере',
      cameraPermSub: 'Разрешите доступ к камере, чтобы сканировать QR. Фото и видео не сохраняются.',
      cameraPermCta: 'Разрешить',
      cameraDenied: 'Доступ к камере не разрешён. Откройте настройки.',
      galleryDenied: 'Доступ к галерее не разрешён',
      galleryDecodeFailed: 'QR-код не найден на фото',
      galleryPickFailed: 'Не удалось открыть фото. Выберите другое',
      alignHint: 'Поместите QR в квадрат',
      viewfinderTitle: 'Откройте камеру',
      viewfinderSub: 'Наведите камеру на стикер — код считается автоматически',
      viewfinderHint: 'Нажмите, чтобы открыть камеру',
      galleryCta: 'Выбрать из галереи',
      galleryPicking: 'Загрузка...',
      orDivider: 'или',
      manualToggle: 'Ввести код вручную',
      manualHint: 'Если стикер повреждён, введите код вручную (например: 42:abc123)',
      manualPlaceholder: '42:ABC123',
      manualSubmit: 'Войти',
      helpStep1: 'Сядьте за любой свободный компьютер в клубе.',
      helpStep2: 'Найдите QR-стикер на мониторе или корпусе ПК.',
      helpStep3: 'Нажмите «Сканировать камерой» и наведите QR в рамку.',
      submittingHint: 'Проверяем...',
      noTenantTitle: 'Сначала выберите клуб',
      noTenantHasClubs: 'Чтобы начать сессию, переключитесь на нужный клуб. Сделать это можно в профиле.',
      noTenantNoClubs: 'Вы не присоединены ни к одному клубу. Для входа по QR сначала вступите в клуб.',
      noTenantToast: 'Сначала подключитесь к клубу',
      pickClubBtn: 'Выбрать клуб',
      joinClubBtn: 'Присоединиться к клубу',
    },
    activeSession: {
      headerTitle: 'Активная сессия',
      pcLabel: 'Компьютер',
      zoneBadge: 'PS зона',
      startTime: 'Время начала',
      elapsed: 'Прошло',
      balanceLabel: 'Остаток баланса',
      quickActions: 'Быстрые действия',
      extend: 'Продлить сессию',
      addBalance: 'Пополнить баланс',
      switchZone: 'Сменить зону',
      endSession: 'Завершить сессию',
      tabSession: 'Сессия',
      tabServices: 'Сервисы',
      tabChat: 'Чат',
      tabSettings: 'Настройки',
      open: 'Открыто',
      awaitingTitle: 'Ожидаем подтверждения',
      awaitingSub:
        'Ваш компьютер пока не найден. Обратитесь к оператору или отсканируйте QR-код заново.',
      pendingTitle: 'Бронь подтверждена',
      pendingSub:
        'Сессия ещё не запущена. Подойдите к компьютеру и дождитесь, пока оператор откроет её.',
    },
    transactionHistory: {
      headerTitle: 'История транзакций',
      filterAll: 'Все',
      filterTopups: 'Пополнения',
      filterBonuses: 'Бонусы',
      filterCharges: 'Списания',
      emptyTitle: 'Транзакций пока нет',
      emptySub:
        'После пополнения баланса все операции будут отображаться здесь.',
      typeTopup: 'Пополнение баланса',
      typeBonus: 'Кэшбэк',
      typePackage: 'Покупка пакета',
      typeSubscription: 'Подписка',
      typeTierBonus: 'Бонус за ранг',
      typeMissionBonus: 'Награда за миссию',
      typeCharge: 'Списание',
      typeRefund: 'Возврат',
      typeOther: 'Другое',
      topupCta: 'Пополнить баланс',
    },
    notificationSettings: {
      headerTitle: 'Настройки уведомлений',
      soonBannerTitle: 'Push-уведомления — скоро',
      soonBannerSub:
        'Настройки сохраняются локально. Как только включим push, ваши предпочтения применятся автоматически.',
      categoriesSection: 'Категории',
      catBookings: 'Бронирования',
      catBookingsSub: 'Подтверждения брони и напоминания',
      catTournaments: 'Турниры',
      catTournamentsSub: 'Анонсы турниров и результаты',
      catOffers: 'Акции',
      catOffersSub: 'Скидки и спецпредложения',
      catSystem: 'Система',
      catSystemSub: 'Обновления приложения и важные уведомления',
      viewInboxLabel: 'Открыть список уведомлений',
      viewInboxSub: 'Inbox — прочитанные и непрочитанные сообщения',
    },
    profile: {
      guestName: 'Гость',
      greeting: 'Привет, {name}!',
      levelBadge: 'Уровень {n}',
      statTotalScore: 'Общий счёт',
      statGames: 'Игры',
      favoriteGames: 'Любимые игры',
      viewAll: 'Все',
      quickLinks: 'Быстрые ссылки',
      quickBook: 'Бронь',
      quickTournaments: 'Турниры',
      quickWallet: 'Кошелёк',
      quickRewards: 'Награды',
      loyaltyTitle: 'Программа лояльности',
      loyaltySub: 'Бронируйте и копите баллы,\nполучайте эксклюзивные подарки!',
      loyaltyBtn: 'Посмотреть награды',
      loyaltyBtnSoon: 'Скоро',
      hours: '{n} ч',
      soon: 'Скоро',
      soonSection: 'Скоро',
      soonSubtitle: 'Новые функции в разработке',
      soonExpandHint: 'Нажмите, чтобы открыть',
      soonCollapseHint: 'Нажмите, чтобы свернуть',
      menu: {
        ai: 'Nexora AI ассистент',
        aiTips: 'AI-рекомендации',
        rewardsCenter: 'Центр наград',
        rewardsShop: 'Магазин наград',
        referEarn: 'Пригласи и получи',
        stats: 'Личная статистика',
        favorites: 'Избранное',
        teams: 'Команды',
        friends: 'Мои друзья',
        friendRequests: 'Заявки в друзья',
        sessionInvites: 'Игровые приглашения',
        myClubs: 'Мои клубы',
        joinClub: 'Присоединиться к клубу',
        reviews: 'Отзывы',
        smartSeat: 'Smart Seat (AI)',
        smartQueue: 'Smart очередь',
        partyBooking: 'Игра с друзьями',
        rating: 'Рейтинг',
        qrScan: 'QR вход',
        help: 'Помощь и поддержка',
        settings: 'Настройки',
      },
    },
    bookings: {
      title: 'Брони',
      tabUpcoming: 'Предстоящие',
      tabHistory: 'История',
      sectionUpcoming: 'Предстоящие брони',
      sectionHistory: 'Прошедшие сеансы',
      statusConfirmed: 'Подтверждено',
      statusCompleted: 'Завершено',
      download: 'Скачать квитанцию',
      durationHours: '{n} ч',
      emptyTitle: 'Пока нет броней',
      emptySub: 'Создайте бронь и следите за ней здесь.',
      cancelBtn: 'Отменить',
      cancelConfirmTitle: 'Отменить бронь?',
      cancelConfirmMessage:
        'Бронь можно отменить не позднее, чем за 1 час до начала сеанса. После подтверждения отмена необратима.',
      cancelConfirmBtn: 'Да, отменить',
      cancelKeepBtn: 'Сохранить',
      cancelSuccess: 'Бронь успешно отменена',
    },
    zoneSwitch: {
      headerTitle: 'Сменить зону',
      currentLabel: 'Текущая зона',
      standardBadge: 'Стандарт',
      extraTimeTitle: 'Дополнительное время',
      upgradeTitle: 'Улучшить зону',
      timeMin30: '+30 минут',
      timeHour1: '+1 час',
      timeHour2: '+2 часа',
      timeHour3: '+3 часа',
      zoneVip: 'VIP зона',
      zoneVipSub: '+20% комфорта',
      zonePremium: 'Премиум зона',
      zonePremiumSub: '+50% комфорта',
      continueBtn: 'Продолжить {amount} сум',
      footer: 'Цены могут отличаться в зависимости от клуба.',
    },
  },
  en: {
    common: {
      currencyUnit: 'UZS',
      error: 'Error',
      ok: 'OK',
      retry: 'Retry',
      cancel: 'Cancel',
      confirm: 'Confirm',
      loading: 'Loading...',
      comingSoon: 'Coming soon',
      permission: {
        locationTitle: 'Location permission',
        locationMessage:
          'Allow location access to show nearby clubs on the map and find the closest Nexora venue. Data is used only for the lookup.',
        cameraTitle: 'Camera permission',
        cameraMessage:
          'We need the camera to scan the QR code on the PC monitor. No images are stored.',
        notificationsTitle: 'Notifications',
        notificationsMessage:
          "We'll let you know about booking confirmations, queue status and promotions. No spam.",
        allow: 'Allow',
        notNow: 'Not now',
        openSettings: 'Open settings',
        deniedTitle: 'Permission denied',
        deniedMessage:
          'You can enable the permission from system settings. Open settings now?',
      },
    },
    tabs: {
      home: 'Home',
      discover: 'Discover',
      bookings: 'Bookings',
      wallet: 'Wallet',
      profile: 'Profile',
      scanQr: 'Scan',
      scanQrA11y: 'Scan PC QR code',
    },
    soon: {
      aiAssistant: {
        title: 'AI assistant coming soon',
        subtitle: 'AI will personalise clubs, times, and games based on how you play.',
      },
      aiRecommendations: {
        title: 'AI recommendations coming soon',
        subtitle: 'AI will pick the best club and time based on your play history.',
      },
      smartSeat: {
        title: 'Smart Seat coming soon',
        subtitle: 'AI picks the best free PC for you — you just confirm.',
      },
      smartQueue: {
        title: 'Smart Queue coming soon',
        subtitle: 'Queue up and get notified the moment a PC frees up.',
      },
      walletTopup: {
        title: 'Top-up coming soon',
        subtitle: 'Top up your balance through Payme or Click at the club for now. In-app top-up arrives soon.',
      },
      sessionInvites: {
        title: 'Session invites coming soon',
        subtitle: 'Invite friends to your live session with one tap.',
      },
      partyBooking: {
        title: 'Play together coming soon',
        subtitle: 'Book several seats at once and play with friends.',
      },
      rating: {
        title: 'Rating coming soon',
        subtitle: 'Track your progress live and climb the club leaderboard.',
      },
      tournaments: {
        title: 'Tournaments coming soon',
        subtitle: 'Prize tournaments, live broadcasts, and team play are on the way.',
      },
      bonusPoints: {
        title: 'Bonus points coming soon',
        subtitle: 'Bonus points, missions, and rewards are being prepared for launch.',
      },
      referEarn: {
        title: 'Refer & earn coming soon',
        subtitle: 'Invite friends and earn bonus points — this launches alongside the rewards system.',
      },
      statistics: {
        title: 'Statistics coming soon',
        subtitle: 'Sessions, hours played, favourite games, and other personal insights are on the way.',
      },
      badgeShort: 'Soon',
    },
    settings: {
      title: 'Settings',
      account: { title: 'Account & Profile', subtitle: 'Personal info, avatar, level' },
      preferences: { title: 'Preferences', subtitle: 'Games, clubs, language and more' },
      privacy: { title: 'Privacy & Security', subtitle: 'Password, 2FA, privacy settings' },
      payment: { title: 'Payment methods', subtitle: 'Cards and other payment options' },
      history: { title: 'Transaction history', subtitle: 'Payments and receipts' },
      notifications: { title: 'Notification settings', subtitle: 'Notifications and reminders' },
      language: 'Language',
      about: 'About app',
      versionPrefix: 'Version',
      comingSoon: 'This section is coming soon',
      logout: 'Log out',
      logoutTitle: 'Log out',
      logoutMessage: 'Are you sure you want to log out?',
      cancel: 'Cancel',
      confirmLogout: 'Log out',
    },
    language: {
      title: 'Select language',
      subtitle: 'App interface language',
    },
    login: {
      titleLine1: 'Glad to see',
      titleLine2: 'you back!',
      subtitle: 'Sign in or create an account\nto continue.',
      tabs: { signin: 'Sign in', signup: 'Sign up' },
      loginPlaceholder: 'Username (e.g. akmal)',
      passwordPlaceholder: 'Password',
      passwordConfirmPlaceholder: 'Confirm password',
      showPasswordA11y: 'Show password',
      hidePasswordA11y: 'Hide password',
      continue: 'Sign in',
      signupBtn: 'Sign up',
      divider: 'or continue with',
      noAccount: "Don't have an account? ",
      haveAccount: 'Already have an account? ',
      signupLink: 'Sign up',
      signinLink: 'Sign in',
      errorLogin: 'Username must be 3-64 chars (letters, digits, _-.)',
      errorPassword: 'Password must be at least 3 characters',
      errorPasswordMismatch: 'Passwords do not match',
      welcomeToast: 'Welcome back!',
      registeredToast: 'Registration successful!',
      socialSoonToast: 'This option is coming soon',
      checkingLabel: 'Checking...',
    },
    home: {
      greetingMorning: 'Good morning',
      greetingDay: 'Good day',
      greetingEvening: 'Good evening',
      greetingNight: 'Good night',
      level: 'Level',
      levelDefault: 'Newcomer',
      clubsTabs: { mine: 'My clubs', all: 'Other clubs' },
      viewAll: 'View all',
      viewAllRemaining: '{n} more',
      promotionsTitle: 'Active promotions',
      emptyTitle: "You haven't joined any club yet",
      emptySub: 'Pick a club from the list or join with a code.',
      emptyBtn: 'Join a club',
      emptyBrowseAllLink: 'Browse all clubs',
      allEmptyTitle: 'No clubs found',
      allEmptySub: "There aren't any clubs right now. Check back later.",
      otherEmptyTitle: "You've joined every club",
      otherEmptySub: 'Open Discover to find new clubs around you.',
      otherEmptyBtn: 'Discover',
      promoEmptyTitle: 'No active promotions yet',
      promoEmptySub: 'When this club launches a promotion, it will appear here.',
      promoEmptyReload: 'Reload',
      promoBonusPercent: '+{n}% bonus',
      promoUntil: 'Until {date}',
      aiTitle: 'Nexora AI assistant',
      aiBeta: 'Beta',
      aiDescription: 'Akmal, here are 3 clubs we recommend for you.',
      aiAction: 'See recommendations',
      guestName: 'Guest',
      openProfileA11y: 'Open profile',
      bellA11y: 'Notifications',
      bellWithUnreadA11y: '{n} unread notifications — open',
    },
    discover: {
      cityTashkent: 'Tashkent',
      searchPlaceholder: 'Search by club or district',
      filters: {
        all: 'All',
        pc: 'PC',
        ps: 'PS zone',
        open: 'Open now',
        more: 'Filter',
      },
      view: { map: 'Map', list: 'List' },
      book: 'Book now',
      direction: 'Directions',
      open24h: 'Open · 24 hours',
      open: 'Open',
      closed: 'Closed',
      emptyTitle: 'Nothing found',
      emptySub: 'Try changing the filter or come back later.',
      citySheetTitle: 'Select a city',
      filterSheetTitle: 'Advanced filters',
      filterRating: 'Rating',
      filterDistance: 'Distance',
      filterReset: 'Reset',
      filterApply: 'Apply',
      soonBadge: 'Soon',
      gpsDeniedTitle: 'Location turned off',
      gpsDeniedSub: 'Tap to discover clubs near you',
      resultsCount: '{n} clubs found',
      clearFilters: 'Clear filters',
      swipeHint: 'Swipe left/right to switch clubs',
      directionsShow: 'Directions',
      directionsHide: 'Hide route',
      directionsLoading: 'Calculating…',
      directionsNeedGps: 'Turn on location first',
      directionsErrorRoute: "Couldn't get the route, try again",
      directionsApprox: 'Approximate route shown',
      directionsApproxHint: 'Approximate — straight line',
      directionsFromYou: 'From you to {club}',
      recenterA11y: 'Recenter on your location',
      zoomInA11y: 'Zoom in',
      zoomOutA11y: 'Zoom out',
      minutesShort: 'min',
      hoursShort: 'h',
      metersShort: 'm',
      kmShort: 'km',
    },
    bookingSuccess: {
      headerStep: '06',
      headerTitle: 'BOOKING CONFIRMED',
      title: 'Booking successful!',
      subtitle: 'Your seat is reserved — show the QR at the club when you arrive.',
      bookingId: 'Booking ID',
      detailClub: 'Club',
      detailTimeFallback: 'Today, time not set',
      detailZone: 'Zone / Seat',
      detailTime: 'Date and time',
      detailPackage: 'Package',
      detailTotal: 'Total',
      qrHint: 'Show this QR at the club',
      actionDirection: 'Directions',
      actionShare: 'Share',
      actionCalendar: 'Calendar',
      homeBtn: 'Home',
      copiedToast: 'Booking ID copied',
      copyIdA11y: 'Copy booking ID',
      shareTitle: 'My Nexora booking:',
      directionMissingClub: 'Club details unavailable',
      calendarMissingTime: 'Time not set',
      calendarTitlePrefix: 'Nexora booking —',
    },
    timeSelect: {
      headerStep: '04',
      headerTitle: 'TIME & PACKAGE',
      title: 'Choose time and package',
      tabPackages: 'Packages',
      tabHourly: 'Hourly',
      pkgHourly: 'Hourly',
      pkgHourlySub: '1 hour',
      pkg3Hour: '3-hour package',
      pkg3HourSub: '3 hours',
      pkgNight: 'Night package',
      pkgNightSub: '22:00 - 08:00',
      pkgPremium: 'Premium day pass',
      pkgPremiumSub: 'Unlimited play all day',
      timeLabel: 'Pick a time',
      todayLabel: 'Today, May 12',
      continue: 'Continue',
      hoursSuffix: 'h',
      noPackagesTitle: 'No packages yet',
      noPackagesSub: 'This club has no packages set up yet. Book hourly instead.',
      noSlotsSub: 'No free slots on this day. Check back tomorrow.',
      peakLabel: 'Peak hour',
      peakHint: 'This is a peak-demand slot. Package price stays the same, but the club may be busy.',
    },
    payment: {
      headerStep: '05',
      headerTitle: 'PAYMENT',
      title: 'Review your order',
      summaryZone: 'PC zone',
      summarySeat: 'Seat {seat}',
      summaryHourly: 'Hourly',
      summaryTime: 'May 12, 12:00 - 13:00',
      promoLabel: 'Promo code',
      promoPlaceholder: 'Enter code',
      promoApply: 'Apply',
      subtotal: 'Subtotal',
      serviceFee: 'Service fee',
      total: 'Total',
      methodLabel: 'Payment method',
      methodClubBalance: 'Club balance',
      methodClubBalanceSub: '{name} · {balance}',
      methodPayme: 'Payme',
      methodPaymeSub: 'Mobile payment',
      methodClick: 'Click',
      methodClickSub: 'Mobile payment',
      noMethodsTitle: 'Not enough balance',
      noMethodsSub: 'In-app top-up is not available yet. Please top up at the club till.',
      confirmBtn: 'Confirm payment',
      secure: 'Your payment is secured',
      errorSeatMissing: 'Please pick a seat first',
      errorSeatUnavailable: 'Selected seat is no longer available. Please pick again.',
      errorSeatTaken: 'This seat was just taken. Please choose another.',
      errorInsufficientBalance: 'Not enough balance',
      errorInsufficientBalanceDetail: 'You need {amount} {unit} more. Top up at the club.',
      rolledToTomorrowWarning: "Time has passed — booking moved to tomorrow {time}.",
    },
    seatSelect: {
      headerStep: '03',
      headerTitle: 'CHOOSE SEAT',
      pickSeat: 'Pick your seat',
      legendAvailable: 'Available',
      legendTaken: 'Taken',
      legendSelected: 'Selected',
      rowLabel: 'Row {letter}',
      screenLabel: 'SCREEN',
      selectedLabel: 'Selected: ',
      continue: 'Continue',
      takenToast: 'This seat is taken',
      perHourSuffix: 'hour',
      allTakenTitle: 'All seats are taken',
      allTakenSub: 'No free seats right now. Try another zone.',
      noLayoutTitle: 'Seat layout not configured',
      noLayoutSub: 'This club has no zone layout yet. Contact the operator.',
    },
    zoneSelect: {
      headerStep: '02',
      headerTitle: 'CHOOSE ZONE',
      title: 'Choose a zone',
      subtitle: 'Pick the zone that fits you',
      pcZone: 'PC zone',
      pcZoneDesc: 'High-performance PCs and comfy chairs',
      vipZone: 'VIP computers',
      vipZoneDesc: 'Premium gear for competitive players',
      psZone: 'PS5 rooms',
      psZoneDesc: 'PS5 consoles and large screens',
      seatUnit: 'seats',
      roomUnit: 'rooms',
      available: '{n} {unit} available',
      full: 'No seats available',
      pricePerHour: '{price} / hour',
      priceAtClub: 'Price set at the club',
      recommended: 'Recommended',
      realtimeTitle: 'Updated in real time',
      realtimeSub: 'Availability is shown in real time.',
      emptyTitle: 'No zones available',
      emptySub: 'All zones are closed or fully booked right now.',
    },
    clubDetails: {
      reviewCount: '({n} reviews)',
      open24h: 'Open · 24 hours',
      open: 'Open',
      closed: 'Closed',
      feature1: 'Powerful\nPCs',
      feature2: 'PS5\nzones',
      feature3: 'Fast\nInternet',
      feature4: 'Premium\nvibe',
      galleryTitle: 'Club photos',
      galleryViewAll: 'View all',
      galleryCounter: '{current} / {total}',
      galleryCloseA11y: 'Close gallery',
      reviewsLink: 'See reviews and write one',
      direction: 'Directions',
      book: 'Book now',
      favoriteAdded: 'Added to favorites',
      favoriteRemoved: 'Removed from favorites',
      favoriteToggleA11y: 'Toggle favourite',
      shareA11y: 'Share club',
      shareError: 'Sharing failed',
      showMore: 'Show more',
      showLess: 'Show less',
      shareMessage: 'Check out {name} on Nexora app!',
      notFoundTitle: 'Club not found',
      notFoundSub: "This club doesn't exist or has been removed.",
      notFoundBtn: 'Go back',
      addressUnknown: 'Address not provided',
      loading: 'Loading...',
      notJoinedTitle: 'Join the club first',
      notJoinedMessage: 'You need to be a member of this club to book here.',
      notJoinedConfirm: 'Join',
      switchingClubToast: 'Switching club...',
      promotionsTitle: 'Club promotions',
      promotionsEmpty: 'No active promotions at this club yet.',
    },
    walletTopup: {
      headerTitle: 'Top up balance',
      amountLabel: 'Enter amount',
      amountUnit: 'soum',
      methodLabel: 'Payment method',
      methodPayme: 'Payme',
      methodClick: 'Click',
      methodFee: 'No fees',
      payBtn: 'Pay {amount} soum',
      secure: 'Secure payment',
      successToast: 'Top-up successful!',
      errorTitle: 'Error',
      errorOpenUrl: 'Could not open the payment provider. Check your browser.',
    },
    clubJoin: {
      headerTitle: 'Join a club',
      title: 'Enter the club code',
      subtitle: 'Enter the invite code from the club admin\nor scan a QR.',
      placeholder: 'e.g. NEXORA-2024',
      qrAlt: 'Scan QR code',
      helpTitle: 'Where to get the code?',
      helpText: '• Ask the club admin\n• On the QR code at the cashier\n• A friend may have sent you an invite',
      joinBtn: 'Join',
      errorEmpty: 'Enter a club code',
      successToast: 'You joined the club!',
      passwordLabel: 'Club password',
      passwordPlaceholder: 'At least {n} characters',
      passwordHint: "This password is specific to this club — you'll use it for future logins. Minimum {n} characters.",
      errorPasswordTooShort: 'Password must be at least {n} characters',
      passwordShow: 'Show password',
      passwordHide: 'Hide password',
      scannedFillPasswordHint: 'Code filled — now enter your password',
    },
    clubPreviewScreen: {
      headerTitle: 'About the club',
      joinBtn: 'Join the club',
    },
    profileEdit: {
      headerTitle: 'Edit profile',
      changeAvatar: 'Change avatar',
      changeAvatarHint: 'Tap to pick a photo from your gallery',
      firstName: 'First name',
      lastName: 'Last name',
      login: 'Login',
      phone: 'Phone number',
      phonePlaceholder: '+998 90 123 45 67',
      phoneHint: 'The club can contact you on this number',
      phoneTooLong: 'Phone number is too long',
      nameTooLong: 'Name is too long (max 64 characters)',
      email: 'Email',
      avatarUrlLabel: 'Avatar URL',
      saveBtn: 'Save',
      successToast: 'Profile updated',
      avatarUploadingHint: 'Uploading…',
      avatarUploadedToast: 'Avatar updated',
      avatarUploadFailed: "Couldn't upload the avatar, try again",
      galleryDenied: 'Gallery access denied',
      avatarTooLarge: 'Image is too large. Max 5 MB',
      avatarTooLargeWithSize: 'Image is too large ({size} MB). Max {max} MB',
      avatarBadDimensions: 'Image dimensions are off. Pick something between 64×64 and 2000×2000 pixels',
      avatarTooSmallWithDims: 'Image is too small. Need at least {min}×{min} pixels',
      avatarTooBigDimsWithDims: 'Image dimensions are too large. Max {max}×{max} pixels',
      avatarBadFormat: 'This format is not supported. Upload JPG, PNG, or WEBP (if HEIC, convert to JPG first)',
      avatarNetworkError: 'No internet connection. Check your Wi-Fi or mobile data',
      avatarServerError: 'Server error. Please try again in a moment',
    },
    writeReview: {
      headerTitle: 'Write a review',
      rateLabel: 'Rate the club',
      rate1: 'Bad',
      rate2: 'Meh',
      rate3: 'Average',
      rate4: 'Good',
      rate5: 'Excellent',
      pickClub: 'Pick a club',
      commentLabel: 'Your review',
      commentPlaceholder: 'Tell us about your experience...',
      submitBtn: 'Submit',
      successToast: 'Review submitted',
      errorMissing: 'Rating and review text are required',
      atmosphereLabel: 'Atmosphere',
      cleanlinessLabel: 'Cleanliness',
      technicalLabel: 'Tech condition',
      peripheralsLabel: 'Peripherals',
    },
    myReviews: {
      headerTitle: 'My reviews',
      countLabel: "You've left {n} reviews",
      emptyTitle: 'No reviews yet',
      emptySub: 'Share your impressions after visiting a club — it helps other players.',
      technicalLabel: 'Tech',
      peripheralsLabel: 'Peripherals',
      unknownClub: 'Club',
    },
    achievements: {
      headerTitle: 'Achievements',
      tabBadges: 'Badges',
      tabCollected: 'Collected',
      tabStats: 'Stats',
      progress: 'Progress',
      earned: 'Earned',
      locked: 'Locked',
      statTotalScore: 'Total score',
      statTrophies: 'Badges',
      statWins: 'Wins',
      statRank: 'Rank',
      sectionFeatured: 'Latest reward',
      viewBtn: 'View reward',
      xpLabel: 'Achievement points',
      badgesSection: 'Badges',
      badgeCount: '38 / 56',
      seasonRewards: 'Seasonal rewards',
      seasonName: 'Season 5',
      seasonEnds: 'Season ends in 18 days',
      badge1Title: 'Tournament winner',
      badge1Sub: '5 times',
      badge2Title: 'Win streak',
      badge2Sub: '10 wins',
      badge3Title: 'The best',
      badge3Sub: 'MVP × 25',
      badge4Title: 'Team leader',
      badge4Sub: '50 games',
      badge5Title: 'Silver medal',
      badge5Sub: '2nd place × 2',
      badge6Title: 'Bronze medal',
      badge6Sub: '3rd place × 3',
      soonTitle: 'Achievements coming soon',
      soonSubtitle: "We're building the achievements system. You'll soon earn badges and rewards for your play.",
      soonBadge: 'Coming soon',
    },
    smartQueue: {
      headerTitle: 'Smart queue',
      title: 'Wait for a free seat\nthe smart way',
      subtitle: 'AI finds the seat that frees up fastest',
      noQueueTitle: 'You are not in queue',
      noQueueSub: 'Tap below to join the queue',
      activeTitle: 'Your queue',
      yourPosition: 'Your position',
      estimatedWait: 'Wait time',
      estimatedMinutes: '~{n} min',
      pcCode: 'PC: {code}',
      leaveBtn: 'Leave queue',
      joinBtn: 'Join queue',
      minutes: '{n} min',
      successJoined: 'You joined the queue',
      successLeft: 'You left the queue',
    },
    smartSeat: {
      headerTitle: 'Smart Seat',
      title: 'AI suggests the best\nseat for you',
      subtitle: 'We analyze your past sessions',
      aiTag: 'AI recommendation',
      reasonLabel: 'Why this seat?',
      pcLabel: 'Recommended PC',
      statusFree: 'Free',
      holdBtn: 'Hold this seat',
      successHeld: 'Seat held',
    },
    teamFinder: {
      headerTitle: 'Team finder',
      title: 'Find players and\nbuild a team',
      gameDropdown: 'Game',
      skillDropdown: 'Skill',
      micToggle: 'With mic',
      sectionPlayers: 'Players',
      sectionTeams: 'Active teams',
      inviteBtn: 'Invite',
      joinBtn: 'Join',
      createBtn: 'Create team',
      cancelBtn: 'Cancel',
      emptyPlayers: 'No players found for this game',
      invitePickerTitle: 'Invite {name} to which team?',
      invitedToast: 'Invitation sent',
      createdToast: 'Team created',
      noTeamHint: 'Create a team first, then invite players',
      createSectionName: 'Team name',
      createPlaceholder: 'e.g. Nexora Stars',
      createHelperGame: "We'll create a team for {game}",
      statusOnline: 'Online',
      statusInGame: 'In game',
      statusOffline: 'Offline',
      invitesTitle: 'New invites · {n}',
      inviteAccept: 'Accept',
      inviteDecline: 'Decline',
      inviteAcceptedToast: 'You joined team "{name}"',
      inviteDeclinedToast: 'Invite declined',
      unknownTeam: 'Team',
      inviteSlotsLabel: '{n} slots',
      stubHint: 'Club member',
      gameSheetTitle: 'Choose game',
      myTeamsTitle: 'My teams · {n}',
    },
    clubReviewsList: {
      headerTitle: 'Reviews',
      avgLabel: 'Average rating',
      writeBtn: 'Write a review',
      sectionRecent: 'Recent reviews',
      writeDisabledIn: 'Next review in {n} h',
    },
    clubsSwitch: {
      headerTitle: 'My clubs',
      sectionMine: 'My clubs',
      activeBadge: 'Active',
      addBtn: 'Add a new club',
      leaveConfirmTitle: 'Leave the club',
      leaveConfirmMessage: 'Are you sure you want to leave this club?',
      leaveBtn: 'Leave',
      cancelBtn: 'Cancel',
      leftToast: 'You left the club',
      activatedToast: 'Club activated',
    },
    rewardsStore: {
      headerTitle: 'Rewards store',
      myPoints: 'My points',
      points: 'points',
      tabAll: 'All',
      tabGames: 'Games',
      tabFood: 'Food',
      tabVip: 'VIP',
      tabPromos: 'Promos',
      historyBtn: 'My history',
      cost: '{n} pts',
      reward1Title: '1 hour free play',
      reward1Sub: 'At any club',
      reward2Title: 'Snack set voucher',
      reward2Sub: 'Drink + Snack',
      reward3Title: 'VIP room, 1 hour',
      reward3Sub: 'Premium room',
      reward4Title: 'Tournament entry',
      reward4Sub: 'Tournament ticket',
      reward5Title: '10% discount coupon',
      reward5Sub: 'On any service',
      reward6Title: '20% discount coupon',
      reward6Sub: 'On any service',
    },
    notifications: {
      headerTitle: 'Notifications',
      tabAll: 'All',
      tabBookings: 'Bookings',
      tabTournaments: 'Tournaments',
      tabOffers: 'Offers',
      tabSystem: 'System',
      emptyTitle: 'No notifications',
      emptySub: 'New notifications will show up here.',
      markAllRead: 'Mark all as read',
      clearAll: 'Clear all',
      clearAllA11y: 'Clear notifications',
      clearAllConfirmTitle: 'Clear everything?',
      clearAllConfirmMessage: 'All notifications will be deleted. This cannot be undone.',
      clearAllConfirm: 'Clear',
      clearAllCancel: 'Cancel',
      clearAllToast: 'Notifications cleared',
      timeMinutes: '{n} min ago',
      timeHours: '{n} h ago',
      timeNow: 'Just now',
      settingsA11y: 'Notification settings',
      n1Title: 'Booking confirmed',
      n1Desc: 'Your booking at Nexora Arena Koramangala for May 24, 18:00 is confirmed.',
      n1Time: '2 minutes ago',
      n2Title: 'Tournament reminder',
      n2Desc: 'Dota 2 Night Cup starts tomorrow at 20:00.',
      n2Time: '15 minutes ago',
      n3Title: 'Offer unlocked!',
      n3Desc: 'Your 20% discount coupon is active. Valid until end of day.',
      n3Time: '1 hour ago',
      n4Title: 'AI recommendation',
      n4Desc: 'A new AI Arena zone is recommended for you. Give it a try!',
      n4Time: '2 hours ago',
      n5Title: 'System message',
      n5Desc: 'A new app update is available. Remember to update.',
      n5Time: '5 hours ago',
    },
    sessionInvites: {
      headerTitle: 'Game invites',
      subtitle: 'Play-together invites from your friends',
      emptyTitle: 'No invites yet',
      emptySub: 'No one has invited you to a play session',
      inviteFromTitle: '{name} invited you',
      pcLabel: 'PC: {code}',
      accept: 'Accept',
      reject: 'Decline',
      acceptedToast: 'Invite accepted',
      rejectedToast: 'Declined',
    },
    bookingExit: {
      title: 'Exit booking',
      message: 'Do you want to exit the booking? Your selections will not be saved.',
      cancel: 'Continue',
      confirm: 'Exit',
    },
    walletScreen: {
      pickerTitle: 'Pick a club',
      pickerSub: 'Wallet is tied to a club balance',
      noClubs: "You haven't joined any club",
      joinClubBtn: 'Join a club',
      emptyTitle: 'No club selected',
      emptyDesc: 'Wallet is per-club. Pick a club to see your balance.',
      emptyPickBtn: 'Pick a club',
      emptyJoinLink: 'Join a new club',
      clubLabel: 'Club:',
      balanceLabel: 'Club balance',
      statCashback: 'Cashback',
      statTodayCashback: 'Today’s cashback',
      cardsTitle: 'My cards',
      cardsAction: 'All cards',
      cardMain: 'Main card',
      quickTopup: 'Quick top-up',
      topupBtn: 'Top up',
      pointsLabel: 'pts',
      balanceShort: 'Balance',
      liveLabel: 'LIVE',
      bonusLabel: 'Bonus',
      paymentMethodsTitle: 'Payment methods',
      paymentMethodA11y: 'Pay with {name}',
      paymeSub: 'Card or bank transfer',
      clickSub: 'Instant payment',
    },
    components: {
      breadcrumbZone: 'Zone',
      breadcrumbSeat: 'Seat',
      breadcrumbTime: 'Time',
      breadcrumbPay: 'Pay',
      clubOpen: 'Open',
      clubClosed: 'Closed',
      clubPsZones: 'PS zone',
      club24h: '24/7 open',
      clubVerified: '✓ Verified',
      clubSoonDetails: 'Details coming soon',
      walletBalanceLabel: 'Your balance',
      walletPointsLabel: 'points',
      membershipBalance: 'Club balance',
      membershipTopup: 'Top up',
      countdownLabel: 'Starts in',
      unitHours: 'h',
      unitMinutes: 'min',
      unitSeconds: 'sec',
      qaBook: 'Book',
      qaPs: 'PS zone',
      qaTournaments: 'Tournaments',
      qaTopup: 'Top up',
      webMapTitle: 'Map on mobile',
      webMapSub: 'Open the app on your phone to see the real map.',
    },
    clubsList: {
      headerTitle: 'Clubs',
      tabMine: 'My clubs',
      tabAll: 'Other clubs',
      emptyTitle: 'You have not joined any club yet',
      emptySub: 'Pick a club from the list or join by code.',
      joinBtn: 'Join a club',
    },
    promotionsList: {
      headerTitle: 'Active promotions',
      emptyTitle: 'No active promotions yet',
      emptySub: 'When clubs launch a new promotion it will show up here.',
    },
    rewardsCenter: {
      headerTitle: 'My rewards',
      totalLabel: 'Total points',
      levelLabel: 'Your level',
      levelName: 'NEXORA PRO',
      levelInfo: 'Level 12',
      streakLabel: 'Daily streak',
      streakDays: '{n} days',
      streakSub: 'Keep it up and win more!',
      activeMissions: 'Active missions',
      viewAll: 'View all',
      recentAchievements: 'Recent achievements',
      claimBtn: 'Claim',
      claimingBtn: '...',
    },
    tournaments: {
      headerTitle: 'Tournaments',
      statusAll: 'All',
      statusLive: 'Live',
      statusUpcoming: 'Upcoming',
      statusFinished: 'Finished',
      sectionFeatured: 'Featured',
      sectionUpcoming: 'Upcoming tournaments',
      liveBadge: 'LIVE',
      registrationEndsIn: 'Registration ends in',
      teamsCount: 'teams',
      registerBtn: 'Register',
      emptyList: 'No tournaments match this filter',
    },
    tournamentDetails: {
      headerTitle: 'Tournament details',
      liveBadge: 'LIVE',
      prizeLabel: 'Total prize pool',
      statRegistrationEnds: 'Registration ends',
      statStart: 'Start time',
      statTeams: 'Teams',
      statFormat: 'Tournament format',
      statServer: 'Server',
      tabDetails: 'Details',
      tabSchedule: 'Schedule',
      tabParticipants: 'Participants',
      tabRules: 'Rules',
      aboutTitle: 'About the tournament',
      aboutDesc: 'An open CS2 tournament. The best teams compete for a 1,500,000 soum prize pool!',
      prizesTitle: 'Prize breakdown',
      prize1: '1st place',
      prize2: '2nd place',
      prize3: '3rd place',
      prize4: '4th place',
      registerBtn: 'Register',
      registeredBtn: 'Registered',
      waitlistBtn: 'On waitlist',
      toastRegistered: "You're registered for the tournament!",
      toastWaitlist: 'Tournament is full — you are on the waitlist',
      notFound: 'Tournament not found',
      teamsRegistered: 'teams registered',
      shareA11y: 'Share tournament',
      scheduleSoon: 'Schedule coming soon\nMatches will appear here once the tournament starts',
      participantsSoon: 'Participants list coming soon\nRegistered teams will appear here',
    },
    friends: {
      headerTitle: 'Friends',
      tabMine: 'My friends',
      tabSearch: 'Search',
      sectionMine: 'My friends ({n})',
      pendingTitle: '{n} new requests',
      pendingSub: 'Tap to view',
      searchPlaceholder: 'Search by login or name...',
      searchEmptyTitle: 'Find a user',
      searchEmptySub: 'Type a login or name and press Enter',
      foundCount: 'Found: {n}',
      addBtn: 'Add friend',
      removeBtn: 'Remove',
      emptyTitle: 'No friends yet',
      emptySub: 'Find other players in the "Search" tab and add them as friends',
      sentToast: 'Friend request sent',
      removedToast: 'Removed from friends',
      searchPromptTitle: 'Find a user',
      searchPromptSub: 'Type a login or name and press the search button',
      outgoingTitle: 'Sent requests · {n}',
      cancelBtn: 'Cancel',
      cancelledToast: 'Request cancelled',
      removeConfirmTitle: 'Remove from friends?',
      removeConfirmMessage: 'Your friendship with {name} will end.',
      removeConfirmYes: 'Remove',
      removeConfirmNo: 'Cancel',
      alreadyFriendsBadge: 'Friend',
      blockedBadge: 'Blocked',
    },
    friendRequests: {
      headerTitle: 'Requests',
      subtitle: 'Friend requests sent to you',
      emptyTitle: 'No requests',
      emptySub: "Nobody has sent you a friend request",
      accept: 'Accept',
      reject: 'Decline',
      acceptedToast: 'Added as a friend',
      rejectedToast: 'Request declined',
    },
    favorites: {
      headerTitle: 'Favorites',
      headerAction: 'View all',
      sectionFav: 'Favorite clubs',
      sectionRebook: 'Quick re-book',
      rebookBtn: 'Book',
      lastBooked: 'Last booked: {date}',
      metaPc: 'PC zone',
      metaPs: 'PS zone',
      emptyTitle: 'No favourite clubs yet',
      emptySub: 'Tap the heart on a club page — it will show up here.',
      discoverBtn: 'Find clubs',
      countLabel: '{n} saved',
      removedToast: '{name} removed from favourites',
      clearAllAction: 'Clear',
      clearAllTitle: 'Clear all favourites?',
      clearAllMessage: '{n} clubs will be removed from your favourites. This cannot be undone.',
      clearAllConfirm: 'Clear all',
      clearAllCancel: 'Cancel',
      clearedToast: 'Favourites cleared',
      fallbackName: 'Club',
    },
    aiAssistant: {
      name: 'Nexora AI',
      role: 'AI assistant',
      greeting: 'Hi Akmal! How can I help you today?',
      sectionTips: 'Smart tips for you',
      sectionHelp: 'How can I help?',
      tip1: 'You usually play in the evenings. From 21:00–00:00 clubs are freer and bonuses are higher.',
      tip2: 'There are 20% discounts in 2 clubs nearby.',
      tip3: 'Playing with a team earns you more points and prize chances.',
      chip1: 'Nearby clubs',
      chip2: 'Best times',
      chip3: 'Bonuses & promos',
      chip4: 'Find a team',
      inputPlaceholder: 'Type a message...',
    },
    helpSupport: {
      headerTitle: 'Help & support',
      aiTitle: 'Nexora helper',
      aiSubtitle: 'Got questions?\nWe’re here to help!',
      searchPlaceholder: 'Type your question...',
      quickActions: 'Quick actions',
      actionChat: 'Live chat',
      actionChatSub: 'Chat with an operator',
      actionCall: 'Call us',
      actionCallSub: 'Support center',
      actionSubmit: 'Submit request',
      actionSubmitSub: 'Send your request',
      actionRemote: 'Remote help',
      actionRemoteSub: 'Get remote assistance',
      popularTopics: 'Frequently asked questions',
      topic1: 'Change / cancel booking',
      topic2: 'Payments & refunds',
      topic3: 'Points & loyalty program',
      viewAll: 'View all',
      topicsEmpty: 'No questions and answers yet.',
      topicsLoading: 'Loading...',
      stillNeedHelp: "Couldn't find what you needed? Reach us through the channels below.",
      ticketSubtitle: 'Describe your issue in detail',
      ticketSubject: 'Subject',
      ticketSubjectPlaceholder: 'e.g. Payment issue',
      ticketMessage: 'Message',
      ticketMessagePlaceholder: 'Describe the issue in detail...',
      ticketSendBtn: 'Send',
      ticketSuccess: 'Request sent. We will reply soon.',
      ticketErrorEmpty: 'Message cannot be empty',
    },
    teamChat: {
      tabChat: 'Chat',
      tabMembers: 'Members',
      tabSettings: 'Settings',
      voiceLabel: 'Voice channel',
      voiceLobby: 'Lobby',
      joinVoice: 'Join voice channel',
      joinedVoice: 'r3v0lt joined the voice channel · 20:25',
      inputPlaceholder: 'Type a message...',
      me: 'You',
      emptyChat: 'No messages yet. Be the first to send one.',
      membersSoon: 'Members panel coming soon\nTeam roster, roles, and ELO will live here',
      settingsSoon: 'Team settings coming soon\nName, logo, rules, and permissions live here',
      you: 'you',
      roleOwner: 'Captain',
      roleInvited: 'Invited',
      membersEmpty: 'No members found',
      menuA11y: 'Team actions',
      leaveAction: 'Leave team',
      disbandAction: 'Disband team',
      leaveConfirmTitle: 'Leave the team?',
      leaveConfirmMessage: "You won't be able to chat here or receive messages anymore.",
      leaveConfirmYes: 'Leave',
      leaveConfirmNo: 'Cancel',
      leftToast: 'You left the team',
      disbandConfirmTitle: 'Disband the team?',
      disbandConfirmMessage: 'This cannot be undone. All members and messages will be removed.',
      disbandConfirmYes: 'Disband',
      disbandConfirmNo: 'Cancel',
      disbandedToast: 'Team disbanded',
    },
    partyBooking: {
      headerTitle: 'Play together',
      title: 'Book with\nyour friends',
      subtitle: 'Pick seats and invite friends — play all together',
      step1: '1. Pick free seats ({selected}/{total})',
      step2: '2. Invite friends ({selected}/{total})',
      noFreeSeats: 'No free seats right now',
      noFriends: "You don't have friends yet",
      findFriends: 'Find friends →',
      bookCta: 'Book {pcs} seats + {friends} friends',
      errorTitle: 'Error',
      errorMin1Pc: 'Pick at least one PC',
      successTitle: 'Done!',
      successMessage: 'Seats booked, invites sent to friends',
      partialInvitesMessage: "Seats booked, but {n} invites couldn't be sent",
    },
    smartRec: {
      headerTitle: 'Recommendations',
      title: 'Picked\nfor you',
      aiTag: 'AI recommendation',
      bestClubs: 'Best clubs',
      bestZones: 'Best zones',
      bestTimes: 'Best time slots',
      viewAll: 'View all',
      today: 'Today',
      zonePs: 'PS zone',
      zonePsMeta: 'High performance · Free',
      zoneVip: 'VIP room',
      zoneVipMeta: 'High comfort · Low load',
      zoneVr: 'VR zone',
      zoneVrMeta: 'Most immersive experience',
      timeGoodLoad: 'Good load',
      timeMostPopular: 'Most popular',
      timeLowLoad: 'Low load',
      emptyClubs: "AI hasn't picked recommendations yet — check back later",
    },
    rating: {
      headerTitle: 'Leaderboard',
      scopeGlobal: 'Global',
      scopeRegion: 'Region',
      scopeFriends: 'Friends',
      filterTop: 'Top 100',
      filterSeason: 'Season 5',
      columnPlayer: 'Player',
      columnRating: 'Rating',
      you: 'You (NexoraWolf)',
      footer: 'Leaderboard refreshes every 24 hours',
    },
    referEarn: {
      headerTitle: 'Refer & earn',
      title: 'Invite friends,\nget rewards!',
      codeLabel: 'Your referral code',
      linkLabel: 'Share your referral link',
      howItWorks: 'How it works?',
      step1: 'Your friend signs up with your code',
      step2: 'They play for the first time',
      step3: 'Both of you get rewarded',
      yourReferrals: 'Your referrals',
      statInvites: 'Invites',
      statActive: 'Active friends',
      statPoints: 'Points earned',
      milestones: 'Milestone rewards',
      milestone5: 'Invite 5 friends',
      milestone10: 'Invite 10 friends',
      milestone20: 'Invite 20 friends',
      received: 'Received',
      milestoneTemplate: 'Invite {n} friends',
      copiedToast: 'Code copied to clipboard',
      shareMessage: 'My referral link for Nexora:',
      copyCodeA11y: 'Copy code',
      shareLinkA11y: 'Share link',
    },
    statistics: {
      headerTitle: 'Statistics',
      title: 'My stats',
      proBadge: 'NEXORA PRO',
      levelLabel: 'Level {n}',
      overall: 'Overall metrics',
      viewAll: 'View all',
      statHours: 'Hours played',
      statSessions: 'Sessions',
      statFavoriteClubs: 'Favorite clubs',
      statTotalSpent: 'Total spent',
      statFavoriteGames: 'Favorite games',
      statAvgRating: 'Average rating',
      valueHours: '{n} h',
      valueSessions: '{n} times',
      valueClubs: '{n}',
      aiInsight: 'AI insight',
      insightLine1: 'You enjoy strategic games and are most active in the evenings.',
      insightLine2: 'Clubs at 20:00–23:00 and team modes are optimal for you.',
    },
    onboarding: {
      skip: 'Skip',
      page1Tagline1: 'Your game. Your arena.',
      page1Tagline2: 'Your win. Always. Anywhere.',
      page1Footer1: 'Built for champions.',
      page1Footer2: 'Powerful for gamers.',
      page2TitlePart1: 'Find the best\n',
      page2TitleAccent: 'clubs',
      page2TitlePart2: '\nnear you',
      page2Subtitle: 'Top-rated clubs, PS zones,\ntournaments and great vibes\nare waiting for you.',
      page3TitlePart1: 'Book.\n',
      page3TitleAccent1: 'Top up. ',
      page3TitleAccent2: 'Play.',
      page3Subtitle: 'Book a PC, top up your balance,\nand dive into the gaming world.\nDon\'t miss a thing.',
      page3Feat1Title: 'Computers',
      page3Feat1Sub: 'High performance',
      page3Feat2Title: 'PS zone',
      page3Feat2Sub: 'With all the gear',
      page3Feat3Title: 'Top up',
      page3Feat3Sub: 'Fast and secure',
    },
    services: {
      headerTitle: 'Services',
      yourSession: 'Your session',
      activeBadge: 'Active',
      balanceLabel: 'Remaining balance',
      sectionTitle: 'Requests & support',
      staffTitle: 'Call staff',
      staffSub: 'Staff will come to your seat',
      issueTitle: 'Report an issue',
      issueSub: 'Technical problem or complaint',
      supportTitle: 'Support',
      supportSub: 'Help center and tech support',
      staffDefaultMsg: 'Need help',
      issueDefaultMsg: 'Technical issue',
      staffSentToast: 'Staff called — they will be with you shortly',
      issueSentToast: 'Issue received',
    },
    qrScan: {
      headerTitle: 'QR check-in',
      subtitle: 'Scan the QR sticker on the PC — your session starts instantly.',
      orCode: 'Or enter the code',
      actionFlash: 'Flash',
      actionGallery: 'From gallery',
      guide: 'How does QR work?',
      invalidFormat: 'Invalid QR format. Example: 42:abc123',
      scanCta: 'Scan with camera',
      cameraPermTitle: 'Camera access needed',
      cameraPermSub: 'Allow camera access to scan QR codes. No photos or video are saved.',
      cameraPermCta: 'Allow',
      cameraDenied: 'Camera access denied. Enable it in Settings.',
      galleryDenied: 'Gallery access denied',
      galleryDecodeFailed: 'No QR code found in the image',
      galleryPickFailed: "Couldn't open the photo. Pick another one",
      alignHint: 'Align the QR inside the box',
      viewfinderTitle: 'Open the camera',
      viewfinderSub: 'Point your camera at the sticker — the code is read automatically',
      viewfinderHint: 'Tap to open the camera',
      galleryCta: 'Pick from gallery',
      galleryPicking: 'Loading...',
      orDivider: 'or',
      manualToggle: 'Enter code manually',
      manualHint: 'If the sticker is damaged, type the code manually (e.g. 42:abc123)',
      manualPlaceholder: '42:ABC123',
      manualSubmit: 'Sign in',
      helpStep1: 'Sit at any free PC in your club.',
      helpStep2: 'Find the QR sticker on the monitor or case.',
      helpStep3: 'Tap "Scan with camera" and align the QR inside the frame.',
      submittingHint: 'Verifying...',
      noTenantTitle: 'Pick a club first',
      noTenantHasClubs: 'Switch into the club you want to play at — you can do it from your profile.',
      noTenantNoClubs: "You're not a member of any club yet. Join one to use QR check-in.",
      noTenantToast: 'Connect to a club first',
      pickClubBtn: 'Pick a club',
      joinClubBtn: 'Join a club',
    },
    activeSession: {
      headerTitle: 'Active session',
      pcLabel: 'Computer',
      zoneBadge: 'PS zone',
      startTime: 'Start time',
      elapsed: 'Elapsed',
      balanceLabel: 'Remaining balance',
      quickActions: 'Quick actions',
      extend: 'Extend session',
      addBalance: 'Add balance',
      switchZone: 'Switch zone',
      endSession: 'End session',
      tabSession: 'Session',
      tabServices: 'Services',
      tabChat: 'Chat',
      tabSettings: 'Settings',
      open: 'Open',
      awaitingTitle: 'Awaiting confirmation',
      awaitingSub:
        "We couldn't find your PC yet. Please check with the operator or scan the QR code again.",
      pendingTitle: 'Booking confirmed',
      pendingSub:
        "Your session hasn't started yet. Head to your PC and wait for the operator to open it.",
    },
    transactionHistory: {
      headerTitle: 'Transaction history',
      filterAll: 'All',
      filterTopups: 'Top-ups',
      filterBonuses: 'Bonuses',
      filterCharges: 'Charges',
      emptyTitle: 'No transactions yet',
      emptySub:
        'Once you top up your balance, every wallet operation will show up here.',
      typeTopup: 'Wallet top-up',
      typeBonus: 'Cashback',
      typePackage: 'Package purchase',
      typeSubscription: 'Subscription',
      typeTierBonus: 'Rank bonus',
      typeMissionBonus: 'Mission reward',
      typeCharge: 'Charge',
      typeRefund: 'Refund',
      typeOther: 'Other',
      topupCta: 'Top up balance',
    },
    notificationSettings: {
      headerTitle: 'Notification settings',
      soonBannerTitle: 'Push notifications — coming soon',
      soonBannerSub:
        "Preferences are saved locally for now. They'll apply automatically once push delivery is enabled.",
      categoriesSection: 'Categories',
      catBookings: 'Bookings',
      catBookingsSub: 'Reservation confirmations and reminders',
      catTournaments: 'Tournaments',
      catTournamentsSub: 'Tournament announcements and results',
      catOffers: 'Offers',
      catOffersSub: 'Discounts and special offers',
      catSystem: 'System',
      catSystemSub: 'App updates and important notices',
      viewInboxLabel: 'Open notifications inbox',
      viewInboxSub: 'Inbox — read and unread messages',
    },
    profile: {
      guestName: 'Guest',
      greeting: 'Hi, {name}!',
      levelBadge: 'Level {n}',
      statTotalScore: 'Total score',
      statGames: 'Games',
      favoriteGames: 'Favorite games',
      viewAll: 'View all',
      quickLinks: 'Quick links',
      quickBook: 'Book',
      quickTournaments: 'Tournaments',
      quickWallet: 'Wallet',
      quickRewards: 'Rewards',
      loyaltyTitle: 'Loyalty rewards',
      loyaltySub: 'Book and earn points,\nget exclusive gifts!',
      loyaltyBtn: 'View rewards',
      loyaltyBtnSoon: 'Coming soon',
      hours: '{n} h',
      soon: 'Soon',
      soonSection: 'Coming soon',
      soonSubtitle: 'New features in the works',
      soonExpandHint: 'Tap to expand',
      soonCollapseHint: 'Tap to collapse',
      menu: {
        ai: 'Nexora AI assistant',
        aiTips: 'AI recommendations',
        rewardsCenter: 'Rewards center',
        rewardsShop: 'Rewards shop',
        referEarn: 'Refer & earn',
        stats: 'Personal stats',
        favorites: 'Favorites',
        teams: 'Teams',
        friends: 'My friends',
        friendRequests: 'Friend requests',
        sessionInvites: 'Game invites',
        myClubs: 'My clubs',
        joinClub: 'Join a club',
        reviews: 'Reviews',
        smartSeat: 'Smart Seat (AI)',
        smartQueue: 'Smart queue',
        partyBooking: 'Play together',
        rating: 'Leaderboard',
        qrScan: 'QR check-in',
        help: 'Help & support',
        settings: 'Settings',
      },
    },
    bookings: {
      title: 'Bookings',
      tabUpcoming: 'Upcoming',
      tabHistory: 'History',
      sectionUpcoming: 'Upcoming bookings',
      sectionHistory: 'Past sessions',
      statusConfirmed: 'Confirmed',
      statusCompleted: 'Completed',
      download: 'Download receipt',
      durationHours: '{n} h',
      emptyTitle: 'No bookings yet',
      emptySub: 'Make a booking and track it here.',
      cancelBtn: 'Cancel',
      cancelConfirmTitle: 'Cancel this booking?',
      cancelConfirmMessage:
        'Bookings can be cancelled at least 1 hour before the session start. This action cannot be undone.',
      cancelConfirmBtn: 'Yes, cancel',
      cancelKeepBtn: 'Keep it',
      cancelSuccess: 'Booking cancelled successfully',
    },
    zoneSwitch: {
      headerTitle: 'Switch zone',
      currentLabel: 'Current zone',
      standardBadge: 'Standard',
      extraTimeTitle: 'Extra time',
      upgradeTitle: 'Upgrade zone',
      timeMin30: '+30 minutes',
      timeHour1: '+1 hour',
      timeHour2: '+2 hours',
      timeHour3: '+3 hours',
      zoneVip: 'VIP zone',
      zoneVipSub: '+20% comfort',
      zonePremium: 'Premium zone',
      zonePremiumSub: '+50% comfort',
      continueBtn: 'Continue · {amount} soum',
      footer: 'Prices may vary by club.',
    },
  },
};
