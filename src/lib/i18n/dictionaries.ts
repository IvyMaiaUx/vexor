import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type DifficultyLevel,
  type ResourceLanguage,
  type ResourceType,
  type SupportedLocale,
} from "@/config/site";

export interface Dictionary {
  nav: {
    home: string;
    catalog: string;
    categories: string;
    forum: string;
    contribute: string;
    submitResource: string;
    bookmarks: string;
    myContributions: string;
    myProfile: string;
    signIn: string;
    signUp: string;
    signOut: string;
    languageLabel: string;
  };
  hero: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    titleEnd: string;
    subtitle: string;
    searchPlaceholder: string;
    searchButton: string;
    allTypes: string;
    allDifficulties: string;
    exploreCatalog: string;
    joinForum: string;
    stats: {
      categories: string;
      resourceTypes: string;
      openSource: string;
      bilingual: string;
    };
  };
  categoriesSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    allFilter: string;
    filterByCategory: string;
  };
  catalogSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    resultsCount: (count: number) => string;
    clearFilters: string;
    noResults: string;
    visitResource: string;
    viewDetails: string;
    viewFullCatalog: string;
    saveBookmark: string;
    savedBookmark: string;
    onlyBookmarks: string;
    sortLabel: string;
    sortNewest: string;
    sortAlphabetical: string;
    allLanguages: string;
    authorLabel: string;
    publishedAtLabel: string;
    pendingBadge: string;
    approvedBadge: string;
  };
  resourceDetail: {
    backToCatalog: string;
    aboutTitle: string;
    metadataTitle: string;
    categoryLabel: string;
    typeLabel: string;
    difficultyLabel: string;
    notApplicable: string;
    languageLabel: string;
    authorLabel: string;
    publishedDateLabel: string;
    officialUrlLabel: string;
    normalizedUrlLabel: string;
    openExternalCta: string;
    securityNotice: string;
    relatedTitle: string;
    notFoundTitle: string;
    notFoundDesc: string;
  };
  submitPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    nameHint: string;
    urlLabel: string;
    urlPlaceholder: string;
    urlHint: string;
    categoryLabel: string;
    typeLabel: string;
    difficultyLabel: string;
    difficultyOptional: string;
    languageLabel: string;
    authorLabel: string;
    authorPlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    submitButton: string;
    cancelButton: string;
    moderationBannerTitle: string;
    moderationBannerBody: string;
    successTitle: string;
    successBody: string;
    viewSubmittedResource: string;
    submitAnother: string;
    errors: {
      nameLength: string;
      descriptionLength: string;
      invalidUrl: string;
      duplicateUrl: string;
      authorLength: string;
    };
    authGate: {
      badge: string;
      title: string;
      description: string;
      rlsNote: string;
      loginCta: string;
      registerCta: string;
      backCatalogCta: string;
      suspendedBadge: string;
      suspendedTitle: string;
      suspendedDescription: string;
      authenticatedBanner: (username: string, role: string) => string;
    };
  };
  auth: {
    loginEyebrow: string;
    loginTitle: string;
    loginSubtitle: string;
    registerEyebrow: string;
    registerTitle: string;
    registerSubtitle: string;
    identifierLabel: string;
    identifierPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    usernameHint: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    displayNameHint: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordHint: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    preferredLanguageLabel: string;
    ethicsCheckboxLabel: string;
    signInButton: string;
    signingInButton: string;
    retrySignOut: string;
    signUpButton: string;
    githubButton: string;
    orDivider: string;
    noAccountPrompt: string;
    createAccountLink: string;
    hasAccountPrompt: string;
    signInLink: string;
    demoAccountsTitle: string;
    demoAccountsSubtitle: string;
    demoMemberBtn: string;
    demoModeratorBtn: string;
    demoAdminBtn: string;
    demoSuspendedBtn: string;
    alreadySignedInTitle: string;
    alreadySignedInBody: (username: string) => string;
    continueToApp: string;
    forgotPasswordLink: string;
    forgotPasswordPage: {
      eyebrow: string;
      title: string;
      subtitle: string;
      emailLabel: string;
      emailPlaceholder: string;
      emailHint: string;
      submitButton: string;
      submittingButton: string;
      antiEnumerationNotice: string;
      simulationNotice: string;
      simulationLinkCta: string;
      backToLogin: string;
      otpLabel: string;
      otpPlaceholder: string;
      otpHint: string;
      verifyAndResetButton: string;
      verifyingAndResettingButton: string;
      resendCodeButton: string;
      changeEmailButton: string;
      invalidOtpError: string;
      expiredOtpError: string;
    };
    resetPasswordPage: {
      eyebrow: string;
      title: string;
      subtitle: string;
      newPasswordLabel: string;
      newPasswordPlaceholder: string;
      newPasswordHint: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      submitButton: string;
      submittingButton: string;
      successTitle: string;
      successMessage: string;
      backToLogin: string;
      continueToCatalog: string;
      verifyingSession: string;
      invalidSessionTitle: string;
      invalidSessionMessage: string;
      requestNewLink: string;
      showPassword: string;
      hidePassword: string;
      strengthTitle: string;
      passwordsMatch: string;
      passwordsDoNotMatch: string;
      strengthLabels: {
        weak: string;
        fair: string;
        good: string;
        strong: string;
      };
      requirements: {
        minChars: string;
        hasNumber: string;
        hasSpecial: string;
      };
    };
    errors: {
      invalidIdentifier: string;
      invalidEmail: string;
      invalidUsername: string;
      usernameTaken: string;
      emailTaken: string;
      displayNameLength: string;
      passwordLength: string;
      passwordMismatch: string;
      ethicsRequired: string;
      invalidCredentials: string;
      networkError: string;
      rateLimited: string;
      profileMissing: string;
      accountSuspended: string;
      logoutFailed: string;
      recoverySessionInvalid: string;
      weakPassword: string;
      samePassword: string;
      passwordUpdateFailed: string;
    };
  };
  forumSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    newTopicCta: string;
    solvedBadge: string;
    repliesLabel: string;
    votesLabel: string;
    byAuthor: string;
  };
  forumPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allCategories: string;
    allTags: string;
    sortLatest: string;
    sortTopVoted: string;
    sortUnanswered: string;
    sortSolved: string;
    pinnedBadge: string;
    lockedBadge: string;
    noTopicsFound: string;
    clearFilters: string;
    resultsCount: (count: number) => string;
    newTopicCta: string;
  };
  topicDetailPage: {
    backToForum: string;
    pinnedNotice: string;
    lockedNotice: string;
    upvoteTopic: string;
    upvotedTopic: string;
    repliesTitle: (count: number) => string;
    noRepliesYet: string;
    acceptedSolutionBadge: string;
    markAsAccepted: string;
    unmarkAccepted: string;
    replyFormTitle: string;
    replyPlaceholder: string;
    replyHint: string;
    previewTab: string;
    writeTab: string;
    sendReplyButton: string;
    replySuccess: string;
    authRequiredToReply: string;
    loginToReply: string;
    suspendedReplyBlocked: string;
    sortRepliesTop: string;
    sortRepliesOldest: string;
    sortRepliesNewest: string;
  };
  newTopicPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    titleHint: string;
    categoryLabel: string;
    categoryHint: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    tagsHint: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    bodyHint: string;
    writeTab: string;
    previewTab: string;
    cancelButton: string;
    submitButton: string;
    guidelinesTitle: string;
    guidelinesBody: string;
    authRequiredTitle: string;
    authRequiredBody: string;
    loginCta: string;
    registerCta: string;
    suspendedTitle: string;
    suspendedBody: string;
    errors: {
      titleLength: string;
      bodyLength: string;
      categoryRequired: string;
      tagsLimit: string;
      tagFormat: string;
    };
  };
  contributeSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: {
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
    };
    ctaPrimary: string;
    securityNote: string;
  };
  footer: {
    description: string;
    ethicsTitle: string;
    ethicsBody: string;
    navigationTitle: string;
    communityTitle: string;
    rights: string;
  };
  pagination: {
    previous: string;
    next: string;
    pageOf: (current: number, total: number) => string;
    showing: (start: number, end: number, total: number) => string;
  };
  bookmarksPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDesc: string;
    exploreCta: string;
    backToCatalog: string;
    countLabel: (count: number) => string;
    clearAll: string;
    removeBookmark: string;
  };
  profilePage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    publicSubtitle: (username: string) => string;
    editProfileButton: string;
    joinedDate: (date: string) => string;
    reputationScore: string;
    reputationLabel: string;
    tabs: {
      overview: string;
      topics: string;
      replies: string;
      contributions: string;
      badges: string;
      settings: string;
    };
    stats: {
      topics: string;
      replies: string;
      acceptedSolutions: string;
      contributions: string;
      upvotes: string;
      reputation: string;
    };
    aboutTitle: string;
    bioEmpty: string;
    interestsTitle: string;
    interestsEmpty: string;
    socialTitle: string;
    noSocial: string;
    notFoundTitle: string;
    notFoundDesc: string;
    backHome: string;
    authRequiredTitle: string;
    authRequiredDesc: string;
    loginCta: string;
    registerCta: string;
    editModal: {
      title: string;
      subtitle: string;
      displayNameLabel: string;
      displayNamePlaceholder: string;
      bioLabel: string;
      bioPlaceholder: string;
      avatarUrlLabel: string;
      avatarUrlPlaceholder: string;
      avatarSectionLabel: string;
      avatarSelectButton: string;
      avatarChangeButton: string;
      avatarCancelSelection: string;
      avatarHint: string;
      avatarUploading: string;
      avatarPreviewAlt: string;
      githubUrlLabel: string;
      githubUrlPlaceholder: string;
      linkedinUrlLabel: string;
      linkedinUrlPlaceholder: string;
      interestsLabel: string;
      interestsPlaceholder: string;
      interestsHint: string;
      languageLabel: string;
      cancelButton: string;
      saveButton: string;
      savingButton: string;
      successMessage: string;
    };
    settings: {
      title: string;
      accountSubtitle: string;
      emailLabel: string;
      emailHint: string;
      roleLabel: string;
      roleHint: string;
      statusLabel: string;
      activeStatus: string;
      suspendedStatus: string;
      mfaTitle: string;
      mfaSubtitle: string;
      mfaBadge: string;
      signOutButton: string;
    };
    emptyStates: {
      topics: string;
      replies: string;
      contributions: string;
    };
  };
  myContributionsPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tabs: {
      overview: string;
      contributions: string;
      activities: string;
    };
    stats: {
      totalSubmitted: string;
      approved: string;
      pending: string;
      rejected: string;
      approvalRate: string;
      forumTopics: string;
      forumReplies: string;
      acceptedSolutions: string;
      vexorScore: string;
    };
    quickActions: {
      submitResource: string;
      createTopic: string;
      viewProfile: string;
    };
    subTabs: {
      catalogResources: string;
      forumTopics: string;
      forumReplies: string;
    };
    filters: {
      allStatuses: string;
      approved: string;
      pending: string;
      rejected: string;
      allTypes: string;
      allCategories: string;
      allActivities: string;
      catalog: string;
      forum: string;
      bookmarks: string;
      profile: string;
      periodAll: string;
      periodToday: string;
      periodWeek: string;
      periodMonth: string;
    };
    rejectionReasonLabel: string;
    timelineTitle: string;
    timelinePrivacyNote: string;
    timelineAuditNote: string;
    clearTimelineBtn: string;
    clearTimelineConfirm: string;
    emptyStates: {
      catalog: string;
      topics: string;
      replies: string;
      activities: string;
    };
    authRequiredTitle: string;
    authRequiredDesc: string;
  };
  cybercrimeResearchPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allTopics: string;
    allThreatLevels: string;
    submitResearchCta: string;
    discussInForumCta: string;
    emptyResults: string;
    clearFilters: string;
    tlpLabel: string;
    techniquesLabel: string;
    readReport: string;
    publishedDate: string;
    authorLabel: string;
    pillarsTitle: string;
    pillarsSubtitle: string;
    spacesTitle: string;
    spacesSubtitle: string;
    categoriesTitle: string;
    categoriesSubtitle: string;
    disclaimerTitle: string;
    disclaimerBody: string;
    librarySpaceTitle: string;
    librarySpaceDesc: string;
    casesSpaceTitle: string;
    casesSpaceDesc: string;
    discussionsSpaceTitle: string;
    discussionsSpaceDesc: string;
    labsSpaceTitle: string;
    labsSpaceDesc: string;
    exploreSpaceCta: string;
    viewCategoryCta: string;
    viewAllCta: string;
    accessRestricted: {
      eyebrow: string;
      title: string;
      subtitle: string;
      loginButton: string;
      registerButton: string;
      backHomeButton: string;
      simulationNotice: string;
      suspendedBanner: string;
      suspendedEyebrow: string;
      suspendedTitle: string;
      suspendedDesc: string;
    };
  };
  adminPanel: {
    sidebar: {
      title: string;
      dashboard: string;
      moderation: string;
      catalog: string;
      forum: string;
      research: string;
      reports: string;
      users: string;
      audit: string;
      backToSite: string;
      roleAdminBadge: string;
      roleModBadge: string;
      adminOnlyBadge: string;
    };
    accessDenied: {
      title: string;
      subtitle: string;
      loginRequiredTitle: string;
      loginRequiredSubtitle: string;
      suspendedTitle: string;
      suspendedSubtitle: string;
      memberTitle: string;
      memberSubtitle: string;
      loginButton: string;
      backHomeButton: string;
      securityNotice: string;
    };
    breadcrumbs: {
      admin: string;
      dashboard: string;
      catalog: string;
      forum: string;
      research: string;
      reports: string;
      users: string;
      audit: string;
    };
    badges: {
      pending: (count: number) => string;
      open: (count: number) => string;
      reviewing: (count: number) => string;
    };
    dashboard: {
      eyebrow: string;
      title: string;
      subtitle: string;
      greeting: (name: string) => string;
      currentDateLabel: string;
      refreshButton: string;
      refreshingButton: string;
      loadingMessage: string;
      errorTitle: string;
      errorMessage: string;
      retryButton: string;
      statsTitle: string;
      alertsTitle: string;
      queueTitle: string;
      auditTitle: string;
      noHistoricalTrends: string;
      viewReportsCta: string;
      viewCatalogCta: string;
      viewQueueCta: string;
      metrics: {
        totalUsersTitle: string;
        totalUsersDesc: (suspended: number) => string;
        activeUsersTitle: string;
        activeUsersDesc: string;
        publicationsTitle: string;
        publicationsDesc: (resources: number, topics: number) => string;
        pendingReportsTitle: string;
        pendingReportsDesc: (count: number) => string;
        pendingResourcesTitle: string;
        pendingResourcesDesc: (count: number) => string;
        moderationQueueTitle: string;
        moderationQueueDesc: (count: number) => string;
      };
      recentActivity: {
        title: string;
        viewAllCta: string;
        empty: string;
        operatorLabel: string;
        targetLabel: string;
      };
      moderationPreview: {
        title: string;
        viewAllCta: string;
        empty: string;
        readOnlyNotice: string;
        submittedLabel: string;
        contentTypes: Record<string, string>;
        statuses: Record<string, string>;
      };
      reportsPreview: {
        title: string;
        viewAllCta: string;
        empty: string;
        pendingCountBadge: (count: number) => string;
        receivedLabel: string;
        privacyNotice: string;
      };
      pendingResourcesPreview: {
        title: string;
        viewAllCta: string;
        empty: string;
        categoryLabel: string;
        submittedLabel: string;
        statusPending: string;
      };
    };
    alerts: {
      urgentReports: (count: number) => string;
      pendingResources: (count: number) => string;
      pendingResearch: (count: number) => string;
      recentSuspensions: (count: number) => string;
      systemHealthy: string;
    };
    queue: {
      tabs: {
        all: string;
        catalog: string;
        reports: string;
        forum: string;
        research: string;
      };
      emptyState: string;
      viewDetails: string;
      authorLabel: string;
      submittedLabel: string;
      targetLabel: string;
      reasonLabel: string;
      statusLabel: string;
      actionApprove: string;
      actionReject: string;
      actionResolve: string;
      actionReview: string;
      reasonRequired: string;
      successAction: string;
    };
    reportsPage: {
      eyebrow: string;
      title: string;
      subtitle: string;
      filterStatus: string;
      filterReason: string;
      filterTarget: string;
      allStatuses: string;
      allReasons: string;
      allTargets: string;
      emptyState: string;
      reportedItem: string;
      reportedBy: string;
      handledBy: string;
      detailsLabel: string;
      resolutionNoteLabel: string;
      resolveBtn: string;
      modalTitle: string;
      modalDesc: string;
      decisionLabel: string;
      justificationPlaceholder: string;
      justificationHint: string;
      cancelBtn: string;
      confirmBtn: string;
      statusLabels: Record<string, string>;
      reasonLabels: Record<string, string>;
      targetLabels: Record<string, string>;
    };
    usersPage: {
      eyebrow: string;
      title: string;
      rbacTitle: string;
      subtitle: string;
      refreshButton: string;
      refreshingButton: string;
      loadingMessage: string;
      errorTitle: string;
      errorMessage: string;
      retryButton: string;
      summary: {
        totalUsers: string;
        activeUsers: string;
        suspendedUsers: string;
        admins: string;
        moderators: string;
      };
      searchLabel: string;
      searchPlaceholder: string;
      filterRole: string;
      filterStatus: string;
      filterPeriod: string;
      allRoles: string;
      allStatuses: string;
      allPeriods: string;
      period7d: string;
      period30d: string;
      period90d: string;
      clearFiltersBtn: string;
      resultsCount: (shown: number, total: number) => string;
      pageSizeLabel: string;
      pageIndicator: (page: number, totalPages: number) => string;
      prevPageBtn: string;
      nextPageBtn: string;
      statusActive: string;
      statusSuspended: string;
      sortLabel: string;
      sortNewest: string;
      sortOldest: string;
      sortAlpha: string;
      userCol: string;
      roleCol: string;
      statusCol: string;
      createdCol: string;
      activityCol: string;
      actionsCol: string;
      noActivity: string;
      viewDetailsBtn: string;
      changeRoleBtn: string;
      suspendBtn: string;
      unsuspendBtn: string;
      emptyTitle: string;
      emptyState: string;
      selfBadge: string;
      roleLabels: Record<string, string>;
      adminActions: {
        title: string;
        badge: string;
        notice: string;
        selfProtected: string;
        lastAdminProtected: string;
      };
      detailsModal: {
        title: string;
        publicInfoTitle: string;
        bioEmpty: string;
        interestsEmpty: string;
        closeBtn: string;
        loadingMessage: string;
        notFoundTitle: string;
        notFoundMessage: string;
        joinedLabel: string;
        lastActivityLabel: string;
        publicLinksTitle: string;
        noPublicLinks: string;
        activityTitle: string;
        noRecentActivity: string;
      };
      roleModal: {
        eyebrow: string;
        title: string;
        desc: string;
        currentRoleLabel: string;
        newRoleLabel: string;
        targetRoleLabel: string;
        currentBadge: string;
        selfProtectedBadge: string;
        lastAdminWarning: string;
        selfDemoteWarning: string;
        warningAdmin: string;
        confirmStepTitle: string;
        confirmStepDesc: (username: string, fromRole: string, toRole: string) => string;
        confirmActionBtn: string;
        backBtn: string;
        processingBtn: string;
        successMessage: string;
        sameRoleError: string;
        roleDescriptions: Record<"member" | "moderator" | "admin", string>;
        cancelBtn: string;
        confirmBtn: string;
        closeAriaLabel: string;
      };
      suspensionModal: {
        suspendEyebrow: string;
        unsuspendEyebrow: string;
        suspendTitle: string;
        unsuspendTitle: string;
        suspendDesc: string;
        unsuspendDesc: string;
        statusLabel: string;
        reasonLabel: string;
        reasonPlaceholder: string;
        reasonHint: string;
        reasonTooShortError: string;
        selfSuspendWarning: string;
        lastAdminWarning: string;
        confirmStepTitle: string;
        confirmSuspendDesc: (username: string) => string;
        confirmUnsuspendDesc: (username: string) => string;
        confirmActionBtn: string;
        backBtn: string;
        processingBtn: string;
        suspendSuccessMessage: string;
        unsuspendSuccessMessage: string;
        cancelBtn: string;
        confirmBtn: string;
        closeAriaLabel: string;
      };
      auditHistory: {
        title: string;
        subtitle: string;
        appendOnlyBadge: string;
        loading: string;
        empty: string;
        actorLabel: string;
        targetLabel: string;
        reasonLabel: string;
        roleTransition: (from: string, to: string) => string;
        actions: Record<string, string>;
      };
      errorMessages: {
        forbidden: string;
        selfDemote: string;
        selfSuspend: string;
        lastAdmin: string;
        reasonTooShort: string;
        alreadySuspended: string;
        alreadyActive: string;
        notFound: string;
        generic: string;
      };
    };
    auditPage: {
      eyebrow: string;
      title: string;
      subtitle: string;
      refreshButton: string;
      refreshingButton: string;
      summary: {
        totalEvents: string;
        criticalEvents: string;
        adminChanges: string;
        accessDenied: string;
        recentEvents: string;
      };
      searchPlaceholder: string;
      filterOperator: string;
      operatorPlaceholder: string;
      filterAction: string;
      filterEntityType: string;
      filterPeriod: string;
      filterSeverity: string;
      allActions: string;
      allEntityTypes: string;
      allPeriods: string;
      allSeverities: string;
      periodToday: string;
      period7Days: string;
      period30Days: string;
      period90Days: string;
      periodCustom: string;
      startDateLabel: string;
      endDateLabel: string;
      sortLabel: string;
      sortNewest: string;
      sortOldest: string;
      clearFiltersBtn: string;
      pageSizeLabel: string;
      resultsCount: (shown: number, total: number) => string;
      pageIndicator: (page: number, totalPages: number) => string;
      prevPageBtn: string;
      nextPageBtn: string;
      idCol: string;
      timestampCol: string;
      actorCol: string;
      actionCol: string;
      entityCol: string;
      severityCol: string;
      metadataCol: string;
      actionsCol: string;
      viewDetailsBtn: string;
      exportCsvBtn: string;
      exportSuccess: (count: number) => string;
      exportEmptyError: string;
      exportError: string;
      loadingMessage: string;
      errorTitle: string;
      errorMessage: string;
      retryButton: string;
      emptyTitle: string;
      emptyState: string;
      incompleteBadge: string;
      immutableNotice: string;
      severityLabels: Record<"info" | "warning" | "critical" | "access_denied", string>;
      detailsModal: {
        eyebrow: string;
        title: string;
        eventInfoTitle: string;
        rawMetadataTitle: string;
        closeBtn: string;
        closeAriaLabel: string;
        actorLabel: string;
        actionLabel: string;
        entityTypeLabel: string;
        entityIdLabel: string;
        timestampLabel: string;
        severityLabel: string;
        descriptionLabel: string;
        reasonLabel: string;
        previousValueLabel: string;
        nextValueLabel: string;
        targetUserLabel: string;
        integrityComplete: string;
        sanitizedBadge: string;
        loadingMessage: string;
        notFoundMessage: string;
        ipNotice: string;
      };
      actionLabels: Record<string, string>;
      entityTypeLabels: Record<string, string>;
    };
    moderationPage: {
      eyebrow: string;
      title: string;
      subtitle: string;
      queueTab: string;
      reportsTab: string;
      searchPlaceholder: string;
      filterType: string;
      filterStatus: string;
      filterPriority: string;
      filterCategory: string;
      filterAuthor: string;
      authorPlaceholder: string;
      filterReports: string;
      filterPeriod: string;
      clearFiltersBtn: string;
      allTypes: string;
      allStatuses: string;
      allPriorities: string;
      allCategories: string;
      allReports: string;
      withReportsOnly: string;
      withoutReportsOnly: string;
      allPeriods: string;
      period24h: string;
      period7d: string;
      period30d: string;
      typeCol: string;
      titleCol: string;
      authorCol: string;
      categoryCol: string;
      submittedCol: string;
      updatedCol: string;
      priorityCol: string;
      reportsCol: string;
      statusCol: string;
      actionsCol: string;
      reviewBtn: string;
      approveBtn: string;
      rejectBtn: string;
      hideBtn: string;
      restoreBtn: string;
      escalateBtn: string;
      requestRevisionBtn: string;
      resubmitBtn: string;
      emptyState: string;
      noQueueItems: string;
      loadError: string;
      retryBtn: string;
      conflictError: string;
      unauthorizedError: string;
      incompleteBadge: string;
      counterPending: string;
      counterTotal: string;
      counterReported: string;
      counterEscalated: string;
      reportsSectionTitle: string;
      reportsEmpty: string;
      reporterProtected: string;
      analyzeReportBtn: string;
      statusLabels: Record<string, string>;
      priorityLabels: Record<string, string>;
      typeLabels: Record<string, string>;
      actionLabels: Record<string, string>;
      detailModal: {
        title: string;
        authorLabel: string;
        categoryLabel: string;
        submittedAtLabel: string;
        updatedAtLabel: string;
        priorityLabel: string;
        reportCountLabel: string;
        flagReasonLabel: string;
        urlInspectionTitle: string;
        urlNonConclusiveNotice: string;
        contentBodyTitle: string;
        historyTitle: string;
        noHistory: string;
        closeBtn: string;
      };
      decisionModal: {
        approveTitle: string;
        rejectTitle: string;
        hideTitle: string;
        restoreTitle: string;
        escalateTitle: string;
        requestRevisionTitle: string;
        approveDesc: string;
        rejectDesc: string;
        hideDesc: string;
        restoreDesc: string;
        escalateDesc: string;
        requestRevisionDesc: string;
        reasonLabel: string;
        reasonOptionalLabel: string;
        reasonPlaceholder: string;
        reasonHint: string;
        reasonMinError: string;
        generalError: string;
        confirmApproveBtn: string;
        confirmRejectBtn: string;
        confirmHideBtn: string;
        confirmRestoreBtn: string;
        confirmEscalateBtn: string;
        confirmRevisionBtn: string;
        cancelBtn: string;
      };
    };
  };
  resourceTypes: Record<ResourceType, string>;
  difficulties: Record<DifficultyLevel, string>;
  languages: Record<ResourceLanguage, string>;
}

const dictionaries: Record<SupportedLocale, Dictionary> = {
  "pt-BR": {
    nav: {
      home: "Início",
      catalog: "Catálogo",
      categories: "Categorias",
      forum: "Fórum",
      contribute: "Contribuir",
      submitResource: "Enviar Recurso",
      bookmarks: "Favoritos",
      myContributions: "Minhas Contribuições",
      myProfile: "Meu Perfil",
      signIn: "Entrar",
      signUp: "Criar Conta",
      signOut: "Sair",
      languageLabel: "Alternar idioma",
    },
    hero: {
      eyebrow: "PLATAFORMA INTERNACIONAL & OPEN SOURCE",
      titleStart: "Conhecimento, ferramentas e comunidade de ",
      titleHighlight: "cibersegurança",
      titleEnd: " em um só lugar.",
      subtitle:
        "Descubra ferramentas, repositórios GitHub, laboratórios práticos, frameworks, CTFs e discuta desafios técnicos com estudantes, analistas e especialistas.",
      searchPlaceholder:
        "Pesquisar ferramentas, repositórios, labs, frameworks (ex.: Wireshark, Sigma, OWASP)...",
      searchButton: "Buscar",
      allTypes: "Todos os tipos",
      allDifficulties: "Qualquer nível",
      exploreCatalog: "Explorar Catálogo Completo",
      joinForum: "Acessar Fórum",
      stats: {
        categories: "12 Domínios Técnicos",
        resourceTypes: "9 Tipos de Recursos",
        openSource: "100% Open Source & Curado",
        bilingual: "Bilíngue (PT-BR / EN)",
      },
    },
    categoriesSection: {
      eyebrow: "DOMÍNIOS DE ESPECIALIZAÇÃO",
      title: "Categorias de Cibersegurança",
      subtitle:
        "Navegue pelas 12 áreas iniciais compartilhadas entre o catálogo de recursos e o fórum comunitário.",
      allFilter: "Todas as categorias",
      filterByCategory: "Filtrar catálogo por esta categoria",
    },
    catalogSection: {
      eyebrow: "DIRETÓRIO CURADO",
      title: "Catálogo de Recursos de Cibersegurança",
      subtitle:
        "Ferramentas, projetos open source, scripts, frameworks, documentações e laboratórios revisados pela comunidade.",
      resultsCount: (count) =>
        count === 1 ? "1 recurso encontrado" : `${count} recursos encontrados`,
      clearFilters: "Limpar filtros",
      noResults: "Nenhum recurso encontrado para os filtros selecionados.",
      visitResource: "Link oficial",
      viewDetails: "Detalhes",
      viewFullCatalog: "Ver Catálogo Completo",
      saveBookmark: "Favoritar",
      savedBookmark: "Salvo",
      onlyBookmarks: "Apenas Favoritos",
      sortLabel: "Ordenar por",
      sortNewest: "Mais recentes",
      sortAlphabetical: "Nome (A–Z)",
      allLanguages: "Todos os idiomas",
      authorLabel: "Mantido por",
      publishedAtLabel: "Incluído em",
      pendingBadge: "Pendente de Revisão",
      approvedBadge: "Verificado",
    },
    resourceDetail: {
      backToCatalog: "Voltar para o Catálogo",
      aboutTitle: "Sobre este recurso",
      metadataTitle: "Ficha Técnica do Recurso",
      categoryLabel: "Categoria",
      typeLabel: "Tipo de Recurso",
      difficultyLabel: "Nível de Dificuldade",
      notApplicable: "Geral / Não aplicável",
      languageLabel: "Idioma do Conteúdo",
      authorLabel: "Autor / Organização",
      publishedDateLabel: "Data de Inclusão",
      officialUrlLabel: "Link Oficial",
      normalizedUrlLabel: "Chave Canônica (RFC 3986)",
      openExternalCta: "Acessar Recurso Oficial",
      securityNotice:
        "Aviso de segurança: você está acessando um link externo. Verifique sempre o domínio oficial e execute ferramentas apenas em ambientes de laboratório ou com autorização explícita.",
      relatedTitle: "Recursos Relacionados na Mesma Categoria",
      notFoundTitle: "Recurso não encontrado",
      notFoundDesc:
        "O recurso solicitado não existe no catálogo ou ainda não foi aprovado pela moderação.",
    },
    submitPage: {
      eyebrow: "CONTRIBUIÇÃO COMUNITÁRIA",
      title: "Sugerir Novo Recurso para o Catálogo",
      subtitle:
        "Compartilhe ferramentas, repositórios GitHub, scripts, laboratórios ou materiais técnicos. Toda submissão recebe status inicial pendente para revisão da moderação.",
      nameLabel: "Nome do Recurso *",
      namePlaceholder: "Ex.: Zeek Network Security Monitor",
      nameHint: "Entre 2 e 120 caracteres.",
      urlLabel: "Link Oficial (URL) *",
      urlPlaceholder: "https://github.com/zeek/zeek",
      urlHint:
        "Apenas links http:// ou https:// (sem URLs duplicadas no catálogo).",
      categoryLabel: "Categoria Principal *",
      typeLabel: "Tipo de Recurso *",
      difficultyLabel: "Nível de Dificuldade",
      difficultyOptional: "Não aplicável / Geral",
      languageLabel: "Idioma do Recurso *",
      authorLabel: "Autor ou Organização Responsável",
      authorPlaceholder: "Ex.: The Zeek Project / OWASP",
      descriptionLabel: "Descrição Técnica *",
      descriptionPlaceholder:
        "Explique de forma clara o propósito da ferramenta, laboratório ou documentação, principais casos de uso defensivos/técnicos e público recomendado...",
      descriptionHint: "Entre 10 e 2.000 caracteres.",
      submitButton: "Enviar para Revisão (Status: Pending)",
      cancelButton: "Voltar ao Catálogo",
      moderationBannerTitle: "Regras de Curadoria e Segurança",
      moderationBannerBody:
        "Não envie links encurtados, executáveis maliciosos sem contexto de análise controlada, credenciais expostas ou materiais que incentivem ataques não autorizados.",
      successTitle: "Recurso enviado para a fila de moderação!",
      successBody:
        "Seu recurso foi registrado com status 'pending' e já pode ser visualizado por você no catálogo local enquanto aguarda aprovação de um moderador.",
      viewSubmittedResource: "Ver Página do Recurso",
      submitAnother: "Enviar Outro Recurso",
      errors: {
        nameLength: "O nome deve ter entre 2 e 120 caracteres.",
        descriptionLength: "A descrição deve ter entre 10 e 2.000 caracteres.",
        invalidUrl:
          "Informe uma URL válida iniciada por https:// ou http:// (máx. 2048 caracteres, sem espaços).",
        duplicateUrl:
          "Esta URL já está cadastrada ou pendente no catálogo (verificação RFC 3986).",
        authorLength:
          "O nome do autor/organização deve ter no máximo 120 caracteres.",
      },
      authGate: {
        badge: "ACESSO PROTEGIDO · RLS ACTIVE MEMBER",
        title: "Autenticação necessária para sugerir recursos",
        description:
          "A submissão comunitária não é aberta a visitantes anônimos. Para proteger o catálogo contra spam e links maliciosos, apenas membros autenticados e com conta ativa podem enviar novos recursos para a fila de moderação.",
        rlsNote:
          "Regra de banco: public.is_active_member() = true AND submitted_by = auth.uid() AND status = 'pending'",
        loginCta: "Entrar na Minha Conta",
        registerCta: "Criar Conta Gratuita",
        backCatalogCta: "Explorar Catálogo Público",
        suspendedBadge: "CONTA SUSPENSA · SOMENTE LEITURA",
        suspendedTitle: "Sua conta está temporariamente suspensa",
        suspendedDescription:
          "Contas suspensas (is_suspended = true) possuem acesso restrito apenas à leitura pública. A criação de recursos, tópicos, votos e favoritos está bloqueada pelas políticas de segurança.",
        authenticatedBanner: (username, role) =>
          `Sessão autenticada como @${username} (${role.toUpperCase()}) · Submissão vinculada ao seu perfil.`,
      },
    },
    auth: {
      loginEyebrow: "ACESSO À COMUNIDADE",
      loginTitle: "Entrar na Plataforma",
      loginSubtitle:
        "Acesse sua conta para sugerir recursos ao catálogo, salvar favoritos, participar do fórum técnico e votar em soluções.",
      registerEyebrow: "REGISTRO DE MEMBRO",
      registerTitle: "Criar Conta na Comunidade",
      registerSubtitle:
        "Junte-se a estudantes, analistas e especialistas em cibersegurança. Seu perfil segue os padrões de segurança do schema Supabase.",
      identifierLabel: "E-mail ou Nome de Usuário *",
      identifierPlaceholder: "analista@exemplo.com ou sec_analyst_br",
      emailLabel: "E-mail *",
      emailPlaceholder: "voce@dominio.com",
      usernameLabel: "Nome de Usuário (Username) *",
      usernamePlaceholder: "ex.: blue_defender_01",
      usernameHint:
        "3 a 30 caracteres: apenas letras minúsculas (a-z), números (0-9) e sublinhado (_).",
      displayNameLabel: "Nome de Exibição",
      displayNamePlaceholder: "Ex.: Ana Silva (SOC Analyst)",
      displayNameHint: "Opcional, até 80 caracteres.",
      passwordLabel: "Senha *",
      passwordPlaceholder: "Mínimo de 8 caracteres",
      passwordHint:
        "Use pelo menos 8 caracteres combinando letras e números/símbolos.",
      confirmPasswordLabel: "Confirmar Senha *",
      confirmPasswordPlaceholder: "Repita sua senha",
      preferredLanguageLabel: "Idioma Preferido da Interface *",
      ethicsCheckboxLabel:
        "Comprometo-me com as diretrizes éticas da plataforma: utilizar e compartilhar conhecimentos exclusivamente para defesa cibernética, aprendizado e testes devidamente autorizados.",
      signInButton: "Entrar na Conta",
      signingInButton: "Autenticando...",
      retrySignOut: "Tentar sair novamente",
      signUpButton: "Criar Conta de Membro",
      githubButton: "Continuar com GitHub (OAuth)",
      orDivider: "ou acesse com credenciais",
      noAccountPrompt: "Ainda não faz parte da comunidade?",
      createAccountLink: "Criar uma conta agora",
      hasAccountPrompt: "Já possui uma conta cadastrada?",
      signInLink: "Fazer login",
      demoAccountsTitle: "Simulador Rápido de Perfis (Modo Pré-Supabase)",
      demoAccountsSubtitle:
        "Teste imediatamente o comportamento das travas de autorização (Membro Ativo, Moderador ou Conta Suspensa):",
      demoMemberBtn: "Entrar como Membro (@sec_analyst_br)",
      demoModeratorBtn: "Entrar como Moderador (@mod_sentinel)",
      demoAdminBtn: "Entrar como Administrador (@root_admin)",
      demoSuspendedBtn: "Testar Conta Suspensa (@suspended_user)",
      alreadySignedInTitle: "Você já está autenticado",
      alreadySignedInBody: (username) =>
        `Sua sessão está ativa como @${username}. Você pode continuar navegando ou encerrar a sessão atual.`,
      continueToApp: "Ir para o Catálogo",
      forgotPasswordLink: "Esqueceu sua senha?",
      forgotPasswordPage: {
        eyebrow: "RECUPERAÇÃO DE ACESSO",
        title: "Recuperar Senha",
        subtitle:
          "Informe o e-mail cadastrado na sua conta Vexor para receber um código de verificação.",
        emailLabel: "E-mail Cadastrado *",
        emailPlaceholder: "analista@exemplo.com",
        emailHint: "Enviaremos um código numérico temporário para redefinir sua senha aqui mesmo.",
        submitButton: "Enviar Código de Recuperação",
        submittingButton: "Enviando código...",
        antiEnumerationNotice:
          "Se existir uma conta associada a este e-mail, enviamos um código de verificação. Verifique sua caixa de entrada e pasta de spam.",
        simulationNotice:
          "Ambiente de Desenvolvimento: Em produção, o envio é despachado via Supabase Auth com token assinado e expiração de 1 hora.",
        simulationLinkCta: "Acessar tela de redefinição de teste →",
        backToLogin: "Voltar para a tela de login",
        otpLabel: "Código de Verificação *",
        otpPlaceholder: "000000",
        otpHint: "Digite o código de 6 dígitos recebido no seu e-mail.",
        verifyAndResetButton: "Verificar Código e Atualizar Senha",
        verifyingAndResettingButton: "Validando código e salvando senha...",
        resendCodeButton: "Reenviar código",
        changeEmailButton: "Alterar e-mail",
        invalidOtpError: "Código de verificação inválido. Confira os dígitos e tente novamente.",
        expiredOtpError: "O código expirou. Clique em \"Reenviar código\" para receber um novo.",
      },
      resetPasswordPage: {
        eyebrow: "REDEFINIÇÃO DE CREDENCIAL",
        title: "Definir Nova Senha",
        subtitle:
          "Crie uma nova senha forte para restabelecer seu acesso à plataforma Vexor.",
        newPasswordLabel: "Nova Senha *",
        newPasswordPlaceholder: "Mínimo de 8 caracteres",
        newPasswordHint: "Combine letras maiúsculas, minúsculas, números e caracteres especiais.",
        confirmPasswordLabel: "Confirmar Nova Senha *",
        confirmPasswordPlaceholder: "Repita a nova senha",
        submitButton: "Atualizar Senha",
        submittingButton: "Salvando nova credencial...",
        successTitle: "Senha Atualizada com Sucesso!",
        successMessage:
          "Sua credencial foi redefinida de forma segura. Você já pode prosseguir com sua sessão ou fazer login com a nova senha.",
        backToLogin: "Ir para o login",
        continueToCatalog: "Ir para o Catálogo",
        verifyingSession: "Validando sessão segura de recuperação...",
        invalidSessionTitle: "Link de recuperação inválido ou expirado",
        invalidSessionMessage:
          "Não foi possível validar uma sessão ativa de recuperação de senha. Solicite um novo link de recuperação.",
        requestNewLink: "Solicitar novo link",
        showPassword: "Mostrar senha",
        hidePassword: "Ocultar senha",
        strengthTitle: "Força da Senha:",
        passwordsMatch: "✓ Senhas conferem",
        passwordsDoNotMatch: "✕ Não confere",
        strengthLabels: {
          weak: "Fraca",
          fair: "Razoável",
          good: "Boa",
          strong: "Forte (Recomendada)",
        },
        requirements: {
          minChars: "Pelo menos 8 caracteres",
          hasNumber: "Pelo menos um número (0-9)",
          hasSpecial: "Pelo menos um símbolo especial (!@#$%...)",
        },
      },
      errors: {
        invalidIdentifier:
          "Informe seu e-mail ou nome de usuário para entrar.",
        invalidEmail: "Informe um endereço de e-mail válido.",
        invalidUsername:
          "Username inválido: use de 3 a 30 caracteres apenas com letras minúsculas, números ou '_' (regex ^[a-z0-9_]{3,30}$).",
        usernameTaken: "Este nome de usuário já está em uso por outro membro.",
        emailTaken: "Este endereço de e-mail já está cadastrado.",
        displayNameLength:
          "O nome de exibição é obrigatório e deve ter entre 1 e 60 caracteres.",
        passwordLength: "A senha deve ter pelo menos 8 caracteres.",
        passwordMismatch: "A confirmação de senha não confere.",
        ethicsRequired:
          "Você precisa aceitar o compromisso de uso ético e segurança defensiva.",
        invalidCredentials:
          "Credenciais inválidas ou e-mail ainda não confirmado. Verifique seu e-mail e senha.",
        networkError:
          "Não foi possível conectar ao servidor de autenticação. Tente novamente em instantes.",
        rateLimited:
          "Muitas tentativas em sequência. Aguarde alguns instantes antes de tentar novamente.",
        profileMissing:
          "Sua conta foi autenticada, mas o perfil correspondente não foi encontrado. Entre em contato com o suporte.",
        accountSuspended:
          "Sua conta está temporariamente suspensa. O acesso às funcionalidades protegidas está bloqueado.",
        logoutFailed:
          "Não foi possível confirmar o encerramento da sessão no servidor. Tente sair novamente.",
        recoverySessionInvalid:
          "Sessão de recuperação ausente ou expirada. Solicite um novo link de redefinição de senha.",
        weakPassword:
          "A senha informada não atende aos requisitos mínimos de segurança.",
        samePassword:
          "A nova senha deve ser diferente da senha anterior.",
        passwordUpdateFailed:
          "Não foi possível atualizar sua senha. Tente novamente em instantes.",
      },
    },
    forumSection: {
      eyebrow: "TROCA DE CONHECIMENTO",
      title: "Discussões Técnicas no Fórum",
      subtitle:
        "Tire dúvidas, compartilhe laboratórios, vote nas melhores respostas e acompanhe tópicos com solução validada.",
      newTopicCta: "Criar Novo Tópico",
      solvedBadge: "Solução Aceita",
      repliesLabel: "respostas",
      votesLabel: "votos",
      byAuthor: "por",
    },
    forumPage: {
      eyebrow: "COMUNIDADE & DEBATE TÉCNICO",
      title: "Fórum de Cibersegurança",
      subtitle:
        "Participe de discussões técnicas, tire dúvidas sobre laboratórios e ferramentas, compartilhe descobertas e colabore com especialistas.",
      searchPlaceholder:
        "Pesquisar tópicos, perguntas ou palavras-chave (ex.: SIEM, reverse engineering, exploit)...",
      allCategories: "Todas as categorias",
      allTags: "Todas as tags",
      sortLatest: "Mais Recentes",
      sortTopVoted: "Mais Votados",
      sortUnanswered: "Sem Respostas",
      sortSolved: "Com Solução",
      pinnedBadge: "Fixado",
      lockedBadge: "Fechado",
      noTopicsFound: "Nenhum tópico encontrado para os critérios pesquisados.",
      clearFilters: "Limpar filtros",
      resultsCount: (count) =>
        count === 1 ? "1 tópico encontrado" : `${count} tópicos encontrados`,
      newTopicCta: "Criar Novo Tópico",
    },
    topicDetailPage: {
      backToForum: "Voltar para o Fórum",
      pinnedNotice: "Tópico fixado pela moderação da comunidade.",
      lockedNotice: "Este tópico está fechado para novas respostas pela moderação.",
      upvoteTopic: "Votar no tópico",
      upvotedTopic: "Votado",
      repliesTitle: (count) =>
        count === 1 ? "1 Resposta Técnica" : `${count} Respostas Técnicas`,
      noRepliesYet:
        "Este tópico ainda não possui respostas. Seja o primeiro a compartilhar uma análise ou solução técnica!",
      acceptedSolutionBadge: "Solução Aceita pelo Autor",
      markAsAccepted: "Marcar como solução aceita",
      unmarkAccepted: "Desmarcar solução",
      replyFormTitle: "Sua Resposta Técnica",
      replyPlaceholder:
        "Descreva sua análise, passos de reprodução, comandos ou solução técnica. Markdown com blocos de código é suportado...",
      replyHint: "Entre 1 e 10.000 caracteres. Utilize Markdown com formatação clara.",
      previewTab: "Visualização",
      writeTab: "Escrever",
      sendReplyButton: "Publicar Resposta",
      replySuccess: "Sua resposta foi publicada com sucesso!",
      authRequiredToReply:
        "Você precisa estar conectado à sua conta ativa para publicar respostas nesta discussão.",
      loginToReply: "Fazer login para responder",
      suspendedReplyBlocked:
        "Sua conta está suspensa e tem acesso apenas para leitura.",
      sortRepliesTop: "Mais votadas",
      sortRepliesOldest: "Mais antigas",
      sortRepliesNewest: "Mais recentes",
    },
    newTopicPage: {
      eyebrow: "NOVA DISCUSSÃO",
      title: "Criar Tópico no Fórum",
      subtitle:
        "Inicie um debate técnico, peça ajuda em uma análise ou compartilhe um método com a comunidade Vexor.",
      titleLabel: "Título do Tópico *",
      titlePlaceholder:
        "Ex.: Análise de persistência via tarefas agendadas em Windows Server",
      titleHint: "Entre 5 e 200 caracteres. Seja específico e descritivo.",
      categoryLabel: "Categoria Técnica *",
      categoryHint: "Selecione a área principal da discussão.",
      tagsLabel: "Tags Técnicas (até 5 tags)",
      tagsPlaceholder: "Ex.: windows, sysmon, dfir, persistence",
      tagsHint:
        "Separe por vírgulas ou espaços. Letras minúsculas, números e hífen (ex: red-team).",
      bodyLabel: "Conteúdo Detalhado (Markdown) *",
      bodyPlaceholder:
        "Contextualize o problema ou compartilhamento: cenário, logs, passos executados, comandos e saídas esperadas...",
      bodyHint: "Entre 10 e 20.000 caracteres. Suporte completo a Markdown seguro.",
      writeTab: "Escrever",
      previewTab: "Visualização",
      cancelButton: "Cancelar",
      submitButton: "Publicar Tópico",
      guidelinesTitle: "Diretrizes de Qualidade do Fórum",
      guidelinesBody:
        "Não compartilhe credenciais reais, payloads destrutivos ou alvos não autorizados. Respeite as políticas de segurança defensiva.",
      authRequiredTitle: "Autenticação Necessária",
      authRequiredBody:
        "Apenas membros ativos da comunidade podem abrir novos tópicos no fórum.",
      loginCta: "Entrar na Conta",
      registerCta: "Criar Conta",
      suspendedTitle: "Conta Suspensa",
      suspendedBody:
        "Contas suspensas não possuem permissão para abrir novos tópicos.",
      errors: {
        titleLength: "O título deve ter entre 5 e 200 caracteres.",
        bodyLength: "O conteúdo deve ter entre 10 e 20.000 caracteres.",
        categoryRequired: "Selecione uma categoria válida.",
        tagsLimit: "Você pode adicionar no máximo 5 tags.",
        tagFormat:
          "Tags devem conter apenas letras minúsculas, números e hífens (1 a 30 caracteres).",
      },
    },
    contributeSection: {
      eyebrow: "CONSTRUÍDO PELA COMUNIDADE",
      title: "Como funciona a contribuição comunitária",
      subtitle:
        "Qualquer membro autenticado pode sugerir ferramentas, scripts, repositórios e materiais de estudo.",
      steps: {
        step1Title: "1. Envio do Recurso",
        step1Desc:
          "Você informa nome, descrição (até 2.000 caracteres), categoria, tipo, dificuldade e link oficial validado.",
        step2Title: "2. Revisão Técnica",
        step2Desc:
          "O recurso entra com status pendente e é analisado por moderadores para garantir qualidade e segurança.",
        step3Title: "3. Publicação Aberta",
        step3Desc:
          "Após aprovado, fica disponível no catálogo público com busca indexada e crédito à sua contribuição.",
      },
      ctaPrimary: "Sugerir um Recurso",
      securityNote:
        "Diretriz ética: plataforma dedicada exclusivamente ao aprendizado e à segurança defensiva e autorizada.",
    },
    footer: {
      description:
        "Plataforma comunitária internacional e open source para centralizar ferramentas, laboratórios, documentações e discussões técnicas de cibersegurança.",
      ethicsTitle: "Uso Ético e Segurança Defensiva",
      ethicsBody:
        "Todo o conteúdo destina-se a fins educacionais, pesquisa autorizada e defesa cibernética. Não é permitida a hospedagem de malware perigoso, vazamento de credenciais ou incentivo a ataques não autorizados.",
      navigationTitle: "Plataforma",
      communityTitle: "Comunidade",
      rights:
        "© 2026 Vexor · Plataforma Comunitária Open Source de Cibersegurança.",
    },
    pagination: {
      previous: "Anterior",
      next: "Próxima",
      pageOf: (current, total) => `Página ${current} de ${total}`,
      showing: (start, end, total) =>
        `Mostrando ${start}–${end} de ${total} recursos`,
    },
    bookmarksPage: {
      eyebrow: "COLEÇÃO PESSOAL",
      title: "Recursos Salvos",
      subtitle:
        "Acesse rapidamente todas as ferramentas, repositórios, laboratórios e artigos que você marcou com estrela.",
      emptyTitle: "Nenhum recurso favoritado ainda",
      emptyDesc:
        "Você ainda não salvou nenhum recurso. Clique no ícone de estrela em qualquer card do catálogo para adicionar itens à sua coleção.",
      exploreCta: "Explorar Catálogo",
      backToCatalog: "Voltar ao Catálogo",
      countLabel: (count) =>
        count === 1 ? "1 recurso salvo" : `${count} recursos salvos`,
      clearAll: "Limpar Favoritos",
      removeBookmark: "Remover dos favoritos",
    },
    profilePage: {
      eyebrow: "PERFIL DO MEMBRO",
      title: "Meu Perfil",
      subtitle: "Gerencie sua identidade, reputação, contribuições e configurações de conta no Vexor.",
      publicSubtitle: (username: string) => `Perfil público e contribuições técnicas de @${username} no Vexor.`,
      editProfileButton: "Editar Perfil",
      joinedDate: (date: string) => `Membro desde ${date}`,
      reputationScore: "Pontos de Reputação",
      reputationLabel: "Vexor Score",
      tabs: {
        overview: "Visão Geral",
        topics: "Tópicos",
        replies: "Respostas",
        contributions: "Contribuições",
        badges: "Conquistas",
        settings: "Conta & Segurança",
      },
      stats: {
        topics: "Tópicos Criados",
        replies: "Respostas Técnicas",
        acceptedSolutions: "Soluções Aceitas",
        contributions: "Recursos Sugeridos",
        upvotes: "Upvotes Recebidos",
        reputation: "Reputação Total",
      },
      aboutTitle: "Sobre",
      bioEmpty: "Nenhuma biografia informada ainda. Clique em Editar Perfil para adicionar uma descrição profissional.",
      interestsTitle: "Áreas de Interesse Técnico",
      interestsEmpty: "Nenhum interesse selecionado.",
      socialTitle: "Conexões Profissionais",
      noSocial: "Nenhuma rede informada.",
      notFoundTitle: "Membro Não Encontrado",
      notFoundDesc: "O perfil de usuário solicitado não existe ou a conta foi removida.",
      backHome: "Voltar ao Início",
      authRequiredTitle: "Autenticação Necessária",
      authRequiredDesc: "Você precisa estar conectado à sua conta Vexor para acessar seu perfil pessoal.",
      loginCta: "Fazer Login",
      registerCta: "Criar Conta",
      editModal: {
        title: "Editar Perfil",
        subtitle: "Atualize suas informações públicas respeitando as políticas do ecossistema Vexor.",
        displayNameLabel: "Nome de Exibição",
        displayNamePlaceholder: "Ex.: Lucas Mendes (SOC Analyst)",
        bioLabel: "Biografia Profissional",
        bioPlaceholder: "Resumo da sua atuação, ferramentas defensivas favoritas ou foco de estudo...",
        avatarUrlLabel: "URL do Avatar (HTTPS)",
        avatarUrlPlaceholder: "https://...",
        avatarSectionLabel: "Foto de Perfil (Avatar)",
        avatarSelectButton: "Selecionar imagem",
        avatarChangeButton: "Trocar imagem",
        avatarCancelSelection: "Cancelar seleção",
        avatarHint: "PNG, JPEG ou WEBP · máximo 2 MB (SVG bloqueado)",
        avatarUploading: "Enviando imagem e salvando...",
        avatarPreviewAlt: "Prévia do avatar",
        githubUrlLabel: "Perfil do GitHub",
        githubUrlPlaceholder: "https://github.com/seu-usuario",
        linkedinUrlLabel: "Perfil do LinkedIn",
        linkedinUrlPlaceholder: "https://linkedin.com/in/seu-usuario",
        interestsLabel: "Áreas de Interesse (até 10)",
        interestsPlaceholder: "Separe por vírgulas (ex: Threat Hunting, DFIR, SIEM, Sysmon)",
        interestsHint: "Pressione vírgula ou Enter para adicionar áreas técnicas.",
        languageLabel: "Idioma Preferido da Plataforma",
        cancelButton: "Cancelar",
        saveButton: "Salvar Alterações",
        savingButton: "Salvando...",
        successMessage: "Perfil atualizado com sucesso!",
      },
      settings: {
        title: "Configurações da Conta",
        accountSubtitle: "Informações cadastrais e credenciais gerenciadas com segurança.",
        emailLabel: "E-mail Cadastrado",
        emailHint: "Privado. Seu e-mail nunca é exposto publicamente para outros membros.",
        roleLabel: "Nível de Permissão",
        roleHint: "Papel atribuído na comunidade. Alterações de privilégio são concedidas via moderação.",
        statusLabel: "Status da Conta",
        activeStatus: "Ativa e Regular",
        suspendedStatus: "Suspensa",
        mfaTitle: "Autenticação em Duas Etapas (2FA)",
        mfaSubtitle: "Camada adicional de proteção para sua conta Vexor.",
        mfaBadge: "Disponível via Supabase Auth na integração",
        signOutButton: "Encerrar Sessão",
      },
      emptyStates: {
        topics: "Nenhum tópico criado por este membro até o momento.",
        replies: "Nenhuma resposta publicada no fórum ainda.",
        contributions: "Nenhum recurso catalogado por este membro ainda.",
      },
    },
    myContributionsPage: {
      eyebrow: "MEU ESPAÇO DEFENSIVO",
      title: "Minhas Contribuições & Atividades",
      subtitle:
        "Acompanhe suas sugestões ao catálogo, suas discussões técnicas no fórum e sua linha do tempo de aprendizado no Vexor.",
      tabs: {
        overview: "Visão Geral",
        contributions: "Minhas Contribuições",
        activities: "Minhas Atividades",
      },
      stats: {
        totalSubmitted: "Recursos Enviados",
        approved: "Aprovados",
        pending: "Em Análise",
        rejected: "Rejeitados",
        approvalRate: "Taxa de Aprovação",
        forumTopics: "Tópicos Abertos",
        forumReplies: "Respostas Técnicas",
        acceptedSolutions: "Soluções Aceitas",
        vexorScore: "Pontuação Vexor",
      },
      quickActions: {
        submitResource: "+ Sugerir Recurso ao Catálogo",
        createTopic: "+ Criar Tópico no Fórum",
        viewProfile: "Ver Perfil Público",
      },
      subTabs: {
        catalogResources: "Recursos do Catálogo",
        forumTopics: "Tópicos no Fórum",
        forumReplies: "Respostas Técnicas",
      },
      filters: {
        allStatuses: "Todos os status",
        approved: "Aprovados",
        pending: "Em Análise",
        rejected: "Rejeitados",
        allTypes: "Todos os tipos",
        allCategories: "Todas as categorias",
        allActivities: "Todas as atividades",
        catalog: "Catálogo",
        forum: "Fórum",
        bookmarks: "Favoritos",
        profile: "Perfil",
        periodAll: "Todo o período",
        periodToday: "Hoje",
        periodWeek: "Esta semana",
        periodMonth: "Este mês",
      },
      rejectionReasonLabel: "Justificativa da Moderação",
      timelineTitle: "Linha do Tempo de Atividades",
      timelinePrivacyNote:
        "🔒 Privacidade: Este histórico pessoal é visível exclusivamente para você.",
      timelineAuditNote:
        "Nota de Auditoria: Limpar o histórico da interface remove apenas visualizações locais. Registros formais de segurança (audit_logs) permanecem imutáveis no banco de dados para integridade e conformidade.",
      clearTimelineBtn: "Limpar Histórico Visual",
      clearTimelineConfirm: "Deseja realmente limpar a visualização da linha do tempo?",
      emptyStates: {
        catalog:
          "Você ainda não enviou nenhum recurso ao catálogo. Sugira uma ferramenta, repositório ou lab prático!",
        topics:
          "Você ainda não iniciou discussões no fórum. Compartilhe uma análise ou abra um debate técnico!",
        replies:
          "Você ainda não publicou respostas no fórum. Colabore com a comunidade respondendo dúvidas!",
        activities:
          "Nenhuma atividade registrada no período selecionado.",
      },
      authRequiredTitle: "Acesso Restrito",
      authRequiredDesc:
        "Você precisa estar conectado à sua conta para gerenciar suas contribuições e atividades.",
    },
    cybercrimeResearchPage: {
      eyebrow: "INTELIGÊNCIA DE AMEAÇAS & DFIR",
      title: "Pesquisa em Cibercrime",
      subtitle:
        "Análises técnicas, relatórios de ameaças, engenharia reversa de malware e rastreamento de operadores de cibercrime produzidos e revisados pela comunidade.",
      searchPlaceholder: "Buscar por ator de ameaça, família de malware, CVE ou técnica ATT&CK...",
      allTopics: "Todas as Áreas",
      allThreatLevels: "Todos os Níveis de Severidade",
      submitResearchCta: "+ Submeter Análise Técnica",
      discussInForumCta: "Debater no Fórum Técnico",
      emptyResults: "Nenhum relatório ou pesquisa encontrada com os filtros atuais.",
      clearFilters: "Limpar Filtros",
      tlpLabel: "Classificação TLP",
      techniquesLabel: "Técnicas MITRE ATT&CK",
      readReport: "Ler Relatório Completo",
      publishedDate: "Publicado em",
      authorLabel: "Pesquisador",
      pillarsTitle: "Dois Pilares de Pesquisa Estratégica",
      pillarsSubtitle:
        "Da dessecação forense de incidentes à análise das redes de monetização e mercados clandestinos.",
      spacesTitle: "Quatro Espaços de Conteúdo Técnico",
      spacesSubtitle:
        "Explore relatórios, estudos de caso detalhados, debates entre pares e laboratórios de análise segura.",
      categoriesTitle: "Dez Categorias Oficiais de Pesquisa",
      categoriesSubtitle:
        "Taxonomia estruturada para classificar ameaças, técnicas de ataque e procedimentos defensivos.",
      disclaimerTitle: "Princípio Ético & Segurança Operacional",
      disclaimerBody:
        "O Vexor é um ecossistema estritamente defensivo e educacional. O estudo e a documentação do cibercrime têm como objetivo capacitar profissionais, prevenir fraudes e proteger a infraestrutura global. Não fornecemos armas cibernéticas nem incentivamos invasões.",
      librarySpaceTitle: "Research Library",
      librarySpaceDesc:
        "Biblioteca centralizada de artigos técnicos, relatórios de ameaças e documentações revisadas por pares.",
      casesSpaceTitle: "Case Studies",
      casesSpaceDesc:
        "Autópsias forenses de incidentes reais com cronologia de ataque, vetores de entrada, IoCs e lições aprendidas.",
      discussionsSpaceTitle: "Technical Discussions",
      discussionsSpaceDesc:
        "Espaço para cooperação científica, levantamento de hipóteses e debate sobre TTPs emergentes com a comunidade.",
      labsSpaceTitle: "Analysis Labs",
      labsSpaceDesc:
        "Metodologias práticas, roteiros de laboratório isolado, instrumentação de hipervisores e regras estritas de OPSEC.",
      exploreSpaceCta: "Acessar Espaço",
      viewCategoryCta: "Ver Categoria",
      viewAllCta: "Ver Todos",
      accessRestricted: {
        eyebrow: "ACESSO RESTRITO · INTELIGÊNCIA EM CIBERCRIME",
        title: "Área Restrita a Membros Autorizados",
        subtitle:
          "O Cybercrime Research é um ambiente técnico fechado para investigação de crimes cibernéticos, estudos de caso periciais e inteligência de submundo. O acesso a todo o acervo técnico, discussões e laboratórios é exclusivo para usuários cadastrados e autenticados na plataforma.",
        loginButton: "Entrar na Conta",
        registerButton: "Cadastre-se",
        backHomeButton: "Voltar ao Início",
        simulationNotice:
          "Ambiente Demonstrativo: O controle de acesso atual é simulado na camada de cliente (frontend) e não substitui os mecanismos de segurança e autorização real que serão implementados no servidor via Supabase e PostgreSQL RLS.",
        suspendedBanner:
          "Aviso de Restrição: Sua conta está suspensa. Você está impedido de visualizar ou submeter pesquisas até a regularização do perfil.",
        suspendedEyebrow: "CONTA SUSPENSA · ACESSO BLOQUEADO",
        suspendedTitle: "Acesso Negado: Conta com Restrições",
        suspendedDesc:
          "Sua conta encontra-se suspensa e não possui permissão para visualizar o conteúdo técnico, estudos de caso forenses ou laboratórios do Cybercrime Research. Regularize seu status com a moderação para restabelecer o acesso.",
      },
    },
    adminPanel: {
      sidebar: {
        title: "Painel de Moderação & Gestão",
        dashboard: "Visão Geral",
        moderation: "Central de Moderação",
        catalog: "Moderação do Catálogo",
        forum: "Moderação do Fórum",
        research: "Cybercrime Research",
        reports: "Central de Denúncias",
        users: "Gestão de Usuários",
        audit: "Logs de Auditoria",
        backToSite: "Voltar à Plataforma",
        roleAdminBadge: "ACESSO ROOT",
        roleModBadge: "MODERADOR",
        adminOnlyBadge: "Admin",
      },
      accessDenied: {
        title: "Acesso Restrito",
        subtitle:
          "Esta área é reservada exclusivamente a moderadores e administradores da comunidade Vexor.",
        loginRequiredTitle: "Autenticação Necessária",
        loginRequiredSubtitle:
          "Você precisa estar conectado com uma conta autorizada para visualizar e gerenciar o painel administrativo.",
        suspendedTitle: "Conta sob Moderação / Suspensa",
        suspendedSubtitle:
          "Sua conta está sob suspensão administrativa ativa. Todas as permissões e acessos a painéis privilegiados estão revogados.",
        memberTitle: "Permissão Insuficiente (Acesso Negado)",
        memberSubtitle:
          "Sua conta possui papel de Membro comum. O acesso administrativo requer credenciais de Moderador ou Administrador de acordo com as políticas de controle de acesso (RBAC) do Vexor.",
        loginButton: "Entrar com outra conta",
        backHomeButton: "Voltar ao Início",
        securityNotice:
          "Aviso de Segurança: Esta tela representa um estado visual de acesso negado na interface. A autorização e proteção real dos dados será implementada posteriormente no servidor e no PostgreSQL via Supabase Auth e Row Level Security (RLS).",
      },
      breadcrumbs: {
        admin: "Admin",
        dashboard: "Visão Geral",
        catalog: "Catálogo",
        forum: "Fórum",
        research: "Cybercrime Research",
        reports: "Denúncias",
        users: "Usuários",
        audit: "Auditoria",
      },
      badges: {
        pending: (count: number) => `${count} pendente${count === 1 ? "" : "s"}`,
        open: (count: number) => `${count} aberta${count === 1 ? "" : "s"}`,
        reviewing: (count: number) => `${count} em análise`,
      },
      dashboard: {
        eyebrow: "CONSOLE DE GOVERNANÇA & MODERAÇÃO",
        title: "Dashboard",
        subtitle:
          "Visão geral da comunidade, publicações, fila de moderação, denúncias e atividade administrativa recente.",
        greeting: (name: string) => `Olá, ${name}`,
        currentDateLabel: "Data atual",
        refreshButton: "Atualizar dados",
        refreshingButton: "Atualizando...",
        loadingMessage: "Carregando indicadores e eventos administrativos...",
        errorTitle: "Falha ao carregar o dashboard",
        errorMessage:
          "Não foi possível consultar os serviços administrativos neste momento. Tente atualizar novamente.",
        retryButton: "Tentar novamente",
        statsTitle: "Indicadores Principais",
        alertsTitle: "Alertas Administrativos e Prioridades",
        queueTitle: "Fila de Moderação",
        auditTitle: "Atividade Recente",
        noHistoricalTrends:
          "Métricas consolidadas diretamente do banco de dados; variações percentuais não são exibidas.",
        viewReportsCta: "Central de Denúncias",
        viewCatalogCta: "Catálogo Admin",
        viewQueueCta: "Ir para Moderação",
        metrics: {
          totalUsersTitle: "Total de usuários",
          totalUsersDesc: (suspended: number) =>
            suspended === 1
              ? "1 conta suspensa registrada"
              : `${suspended} contas suspensas registradas`,
          activeUsersTitle: "Usuários ativos",
          activeUsersDesc: "Contas habilitadas na plataforma",
          publicationsTitle: "Publicações",
          publicationsDesc: (resources: number, topics: number) =>
            `${resources} recursos · ${topics} tópicos`,
          pendingReportsTitle: "Denúncias pendentes",
          pendingReportsDesc: (count: number) =>
            count === 0 ? "Nenhuma denúncia pendente" : "Aguardando triagem",
          pendingResourcesTitle: "Recursos aguardando aprovação",
          pendingResourcesDesc: (count: number) =>
            count === 0 ? "Catálogo em dia" : "Aguardando revisão técnica",
          moderationQueueTitle: "Itens na fila de moderação",
          moderationQueueDesc: (count: number) =>
            count === 0 ? "Fila de moderação vazia" : "Pendentes de avaliação",
        },
        recentActivity: {
          title: "Atividade Recente",
          viewAllCta: "Ver auditoria completa",
          empty: "Nenhum evento administrativo registrado até o momento.",
          operatorLabel: "Operador",
          targetLabel: "Alvo",
        },
        moderationPreview: {
          title: "Prévia da Fila de Moderação",
          viewAllCta: "Abrir página de moderação",
          empty: "Nenhum item pendente na fila de moderação.",
          readOnlyNotice: "Prévia somente leitura — decisões são realizadas na página de moderação.",
          submittedLabel: "Enviado em",
          contentTypes: {
            resource: "Recurso",
            topic: "Tópico",
            post: "Resposta",
            research: "Pesquisa DFIR",
          },
          statuses: {
            pending: "Pendente",
            revision_requested: "Revisão solicitada",
            published: "Publicado",
            approved: "Aprovado",
            rejected: "Rejeitado",
            hidden: "Oculto",
          },
        },
        reportsPreview: {
          title: "Denúncias Recentes",
          viewAllCta: "Abrir denúncias",
          empty: "Nenhuma denúncia pendente no momento.",
          pendingCountBadge: (count: number) =>
            count === 1 ? "1 pendente" : `${count} pendentes`,
          receivedLabel: "Recebida em",
          privacyNotice: "Identidade do denunciante omitida nesta prévia.",
        },
        pendingResourcesPreview: {
          title: "Recursos Aguardando Aprovação",
          viewAllCta: "Abrir catálogo administrativo",
          empty: "Nenhum recurso aguardando aprovação no catálogo.",
          categoryLabel: "Categoria",
          submittedLabel: "Enviado em",
          statusPending: "Aguardando aprovação",
        },
      },
      alerts: {
        urgentReports: (count: number) =>
          `Atenção: Existem ${count} denúncia${count === 1 ? "" : "s"} aberta${count === 1 ? "" : "s"} aguardando triagem técnica imediata.`,
        pendingResources: (count: number) =>
          `Catálogo: ${count} recurso${count === 1 ? "" : "s"} pendente${count === 1 ? "" : "s"} de revisão técnica pelos moderadores.`,
        pendingResearch: (count: number) =>
          `Pesquisa DFIR: ${count} submissão${count === 1 ? "" : "ões"} de inteligência de ameaças aguardando peer-review.`,
        recentSuspensions: (count: number) =>
          `Segurança: ${count} conta${count === 1 ? "" : "s"} suspensa${count === 1 ? "" : "s"} preventivamente no período recente.`,
        systemHealthy: "Status operacional estável: não há pendências críticas na fila de moderação.",
      },
      queue: {
        tabs: {
          all: "Todas as Pendências",
          catalog: "Catálogo",
          reports: "Denúncias",
          forum: "Fórum",
          research: "Research DFIR",
        },
        emptyState: "Nenhum item pendente de moderação nesta categoria.",
        viewDetails: "Detalhes e Contexto",
        authorLabel: "Autor / Remetente",
        submittedLabel: "Data de Envio",
        targetLabel: "Tipo de Alvo",
        reasonLabel: "Motivo / Justificativa",
        statusLabel: "Status Atual",
        actionApprove: "Aprovar e Publicar",
        actionReject: "Rejeitar Envio",
        actionResolve: "Tratar Denúncia",
        actionReview: "Marcar em Análise",
        reasonRequired: "Informe uma justificativa técnica obrigatória para esta decisão.",
        successAction: "Ação de moderação registrada com sucesso na trilha de auditoria.",
      },
      reportsPage: {
        eyebrow: "MODERAÇÃO & INTEGRIDADE",
        title: "Central de Denúncias",
        subtitle:
          "Triagem e tratamento de denúncias de infrações, violações de termos, spam e conteúdo potencialmente malicioso reportado pela comunidade.",
        filterStatus: "Filtrar por Status",
        filterReason: "Filtrar por Motivo",
        filterTarget: "Filtrar por Tipo de Alvo",
        allStatuses: "Todos os Status",
        allReasons: "Todos os Motivos",
        allTargets: "Todos os Alvos",
        emptyState: "Nenhuma denúncia encontrada para os filtros selecionados.",
        reportedItem: "Item Denunciado",
        reportedBy: "Denunciante",
        handledBy: "Resolvido por",
        detailsLabel: "Detalhes informados na denúncia",
        resolutionNoteLabel: "Nota Técnica de Resolução",
        resolveBtn: "Tratar / Resolver",
        modalTitle: "Tratamento de Denúncia",
        modalDesc:
          "Defina o novo status da denúncia e registre uma justificativa técnica clara. Esta decisão será gravada de forma imutável nos logs de auditoria.",
        decisionLabel: "Decisão / Novo Status *",
        justificationPlaceholder:
          "Descreva o motivo da resolução, ação tomada no conteúdo (ex: ocultação, advertência, descarte por improcedência)...",
        justificationHint: "Mínimo 5 caracteres. Registro auditado de segurança.",
        cancelBtn: "Cancelar",
        confirmBtn: "Gravar Resolução",
        statusLabels: {
          open: "Aberta",
          reviewing: "Em Análise",
          resolved: "Resolvida (Infração Confirmada)",
          dismissed: "Descartada (Improcedente)",
        },
        reasonLabels: {
          spam: "Spam ou Propaganda Não Solicitada",
          malicious_content: "Conteúdo Inseguro ou Malware Potencial",
          personal_data: "Vazamento de Dados Pessoais / PII",
          harassment: "Conduta Agressiva ou Assédio",
          unauthorized_attack: "Ataque Não Autorizado / Uso Ilícito",
          copyright: "Violação de Direitos Autorais",
          other: "Outro Motivo",
        },
        targetLabels: {
          topic: "Tópico do Fórum",
          post: "Resposta do Fórum",
          resource: "Recurso do Catálogo",
          profile: "Perfil de Usuário",
        },
      },
      usersPage: {
        eyebrow: "CONTROLE DE ACESSO & SEGURANÇA",
        title: "Gerenciamento de usuários",
        rbacTitle: "Gestão de Usuários (RBAC)",
        subtitle:
          "Consulte, pesquise e filtre contas cadastradas na comunidade, papéis de acesso e situação cadastral.",
        refreshButton: "Atualizar dados",
        refreshingButton: "Atualizando...",
        loadingMessage: "Carregando usuários...",
        errorTitle: "Falha ao carregar usuários",
        errorMessage:
          "Não foi possível consultar o serviço administrativo de usuários. Tente novamente.",
        retryButton: "Tentar novamente",
        summary: {
          totalUsers: "Total de usuários",
          activeUsers: "Usuários ativos",
          suspendedUsers: "Usuários suspensos",
          admins: "Administradores",
          moderators: "Moderadores",
        },
        searchLabel: "Pesquisar por nome ou username",
        searchPlaceholder: "Buscar por nome ou @username...",
        filterRole: "Filtrar por Papel",
        filterStatus: "Filtrar por Situação",
        filterPeriod: "Período de cadastro",
        allRoles: "Todos os papéis",
        allStatuses: "Todas as situações",
        allPeriods: "Todo o período",
        period7d: "Últimos 7 dias",
        period30d: "Últimos 30 dias",
        period90d: "Últimos 90 dias",
        clearFiltersBtn: "Limpar filtros",
        resultsCount: (shown: number, total: number) =>
          `Exibindo ${shown} de ${total} usuário${total === 1 ? "" : "s"}`,
        pageSizeLabel: "Por página",
        pageIndicator: (page: number, totalPages: number) =>
          `Página ${page} de ${totalPages}`,
        prevPageBtn: "Anterior",
        nextPageBtn: "Próxima",
        statusActive: "Ativo",
        statusSuspended: "Suspenso",
        sortLabel: "Ordenar",
        sortNewest: "Mais recentes",
        sortOldest: "Mais antigos",
        sortAlpha: "Nome (A-Z)",
        userCol: "Usuário",
        roleCol: "Papel",
        statusCol: "Situação",
        createdCol: "Cadastro",
        activityCol: "Atividade",
        actionsCol: "Ações",
        noActivity: "Sem atividade recente",
        viewDetailsBtn: "Detalhes",
        changeRoleBtn: "Alterar papel",
        suspendBtn: "Suspender usuário",
        unsuspendBtn: "Reativar usuário",
        emptyTitle: "Nenhum usuário encontrado",
        emptyState: "Nenhum usuário encontrado com os filtros selecionados.",
        selfBadge: "Sua Conta",
        roleLabels: {
          member: "Member",
          moderator: "Moderator",
          admin: "Admin",
        },
        adminActions: {
          title: "Ações administrativas",
          badge: "RBAC",
          notice:
            "As operações abaixo são aplicadas no banco de dados via RPCs administrativas autenticadas e registradas na trilha de auditoria.",
          selfProtected: "Administradores não podem rebaixar ou suspender a própria conta.",
          lastAdminProtected: "O último administrador ativo não pode ser rebaixado ou suspenso.",
        },
        detailsModal: {
          title: "Detalhes do Usuário",
          publicInfoTitle: "Informações Públicas do Perfil",
          bioEmpty: "Nenhuma biografia cadastrada.",
          interestsEmpty: "Nenhum interesse informado.",
          closeBtn: "Fechar",
          loadingMessage: "Carregando ficha do usuário...",
          notFoundTitle: "Usuário não encontrado",
          notFoundMessage:
            "O registro solicitado não foi localizado.",
          joinedLabel: "Data de cadastro",
          lastActivityLabel: "Última atividade",
          publicLinksTitle: "Links públicos",
          noPublicLinks: "Nenhum link público informado.",
          activityTitle: "Histórico administrativo do usuário",
          noRecentActivity: "Nenhum evento administrativo recente para este usuário.",
        },
        roleModal: {
          eyebrow: "GOVERNANÇA RBAC",
          title: "Alterar Papel do Usuário",
          desc: "A alteração de papel aplica as novas permissões no banco de dados e grava o evento user.role_changed na auditoria.",
          currentRoleLabel: "Papel Atual:",
          newRoleLabel: "Novo Papel RBAC *",
          targetRoleLabel: "Papel de Destino:",
          currentBadge: "Atual",
          selfProtectedBadge: "Auto-rebaixamento bloqueado",
          lastAdminWarning:
            "Operação bloqueada: não é permitido rebaixar o último administrador ativo.",
          selfDemoteWarning:
            "Administradores não podem rebaixar a própria conta.",
          warningAdmin:
            "Atenção: A concessão do papel 'admin' libera controle administrativo completo no ambiente da plataforma.",
          confirmStepTitle: "Confirmar alteração de papel",
          confirmStepDesc: (username: string, fromRole: string, toRole: string) =>
            `Confirma a alteração do papel de @${username} de ${fromRole} para ${toRole}?`,
          confirmActionBtn: "Confirmar e aplicar",
          backBtn: "Voltar",
          processingBtn: "Processando...",
          successMessage: "Papel atualizado com sucesso.",
          sameRoleError: "Selecione um papel diferente do papel atual.",
          roleDescriptions: {
            member:
              "Acesso padrão à comunidade: leitura, participação em tópicos e envio de recursos.",
            moderator:
              "Poderes de moderação: revisão de recursos, tópicos, postagens e denúncias.",
            admin:
              "Controle administrativo completo: governança de papéis RBAC, suspensões e auditoria.",
          },
          cancelBtn: "Cancelar",
          confirmBtn: "Revisar alteração",
          closeAriaLabel: "Fechar modal",
        },
        suspensionModal: {
          suspendEyebrow: "SANÇÃO ADMINISTRATIVA",
          unsuspendEyebrow: "REABILITAÇÃO ADMINISTRATIVA",
          suspendTitle: "Suspender Conta de Usuário",
          unsuspendTitle: "Reativar Conta de Usuário",
          suspendDesc:
            "A suspensão revoga a capacidade do usuário de interagir na comunidade e registra o evento user.suspended.",
          unsuspendDesc:
            "A reativação restaura o estado ativo da conta e registra o evento user.unsuspended.",
          statusLabel: "Situação:",
          reasonLabel: "Justificativa Técnica (Obrigatória) *",
          reasonPlaceholder:
            "Descreva detalhadamente o motivo da suspensão (mínimo 5 caracteres)...",
          reasonHint: "Mínimo 5 caracteres após remover espaços. Obrigatório para auditoria.",
          reasonTooShortError:
            "A justificativa técnica deve conter pelo menos 5 caracteres.",
          selfSuspendWarning:
            "Administradores não podem suspender a própria conta.",
          lastAdminWarning:
            "Operação bloqueada: não é permitido suspender o último administrador ativo.",
          confirmStepTitle: "Confirmar operação",
          confirmSuspendDesc: (username: string) =>
            `Confirma a suspensão da conta @${username}?`,
          confirmUnsuspendDesc: (username: string) =>
            `Confirma a reativação da conta @${username}?`,
          confirmActionBtn: "Confirmar e aplicar",
          backBtn: "Voltar",
          processingBtn: "Processando...",
          suspendSuccessMessage: "Usuário suspenso com sucesso.",
          unsuspendSuccessMessage: "Usuário reativado com sucesso.",
          cancelBtn: "Cancelar",
          confirmBtn: "Revisar ação",
          closeAriaLabel: "Fechar modal",
        },
        auditHistory: {
          title: "Histórico de Alterações de Acesso e Situação",
          subtitle:
            "Registro append-only das alterações de papel, suspensão e reativação.",
          appendOnlyBadge: "APPEND-ONLY",
          loading: "Carregando histórico...",
          empty: "Nenhuma alteração administrativa registrada ainda.",
          actorLabel: "Ator",
          targetLabel: "Usuário afetado",
          reasonLabel: "Justificativa",
          roleTransition: (from: string, to: string) => `${from} → ${to}`,
          actions: {
            "user.role_changed": "Alteração de papel",
            "user.role_updated": "Alteração de papel",
            "user.suspended": "Suspensão de usuário",
            "user.unsuspended": "Reativação de usuário",
          },
        },
        errorMessages: {
          forbidden: "Acesso negado (42501): apenas administradores ativos podem executar esta ação.",
          selfDemote: "Operação bloqueada (42501): administradores não podem rebaixar a própria conta.",
          selfSuspend: "Operação bloqueada (42501): administradores não podem suspender a própria conta.",
          lastAdmin: "Operação bloqueada (42501): não é permitido rebaixar ou suspender o último administrador ativo.",
          reasonTooShort: "Validação falhou (22023): a justificativa deve ter pelo menos 5 caracteres.",
          alreadySuspended: "Operação inválida (22023): o usuário já está suspenso.",
          alreadyActive: "Operação inválida (22023): o usuário já está ativo.",
          notFound: "Registro não encontrado (P0002).",
          generic: "Não foi possível concluir a operação.",
        },
      },
      auditPage: {
        eyebrow: "SEGURANÇA & CONFORMIDADE",
        title: "Central de Auditoria de Segurança",
        subtitle:
          "Registro somente leitura (append-only) de intervenções administrativas, alterações de papéis, moderação, suspensões e bloqueios de acesso.",
        refreshButton: "Atualizar registros",
        refreshingButton: "Atualizando...",
        summary: {
          totalEvents: "Total de eventos",
          criticalEvents: "Eventos críticos",
          adminChanges: "Alterações administrativas",
          accessDenied: "Acessos negados",
          recentEvents: "Últimas 24h",
        },
        searchPlaceholder: "Buscar por operador, ID da entidade, ação ou metadados...",
        filterOperator: "Operador",
        operatorPlaceholder: "Filtrar por @operador...",
        filterAction: "Filtrar por Ação",
        filterEntityType: "Tipo de Entidade",
        filterPeriod: "Período",
        filterSeverity: "Classificação",
        allActions: "Todas as Ações",
        allEntityTypes: "Todas as Entidades",
        allPeriods: "Todo o Histórico",
        allSeverities: "Todas as Classificações",
        periodToday: "Hoje (24h)",
        period7Days: "Últimos 7 Dias",
        period30Days: "Últimos 30 Dias",
        period90Days: "Últimos 90 Dias",
        periodCustom: "Intervalo personalizado",
        startDateLabel: "Data inicial",
        endDateLabel: "Data final",
        sortLabel: "Ordenação",
        sortNewest: "Mais recentes",
        sortOldest: "Mais antigos",
        clearFiltersBtn: "Limpar filtros",
        pageSizeLabel: "Por página",
        resultsCount: (shown: number, total: number) =>
          `Exibindo ${shown} de ${total} evento${total === 1 ? "" : "s"}`,
        pageIndicator: (page: number, totalPages: number) =>
          `Página ${page} de ${totalPages}`,
        prevPageBtn: "Anterior",
        nextPageBtn: "Próxima",
        idCol: "ID",
        timestampCol: "Data / Hora",
        actorCol: "Operador",
        actionCol: "Ação Auditada",
        entityCol: "Entidade Alvo",
        severityCol: "Classificação",
        metadataCol: "Registro / Metadados",
        actionsCol: "Ações",
        viewDetailsBtn: "Detalhes",
        exportCsvBtn: "Exportar CSV",
        exportSuccess: (count: number) =>
          `CSV exportado com segurança (${count} registro${count === 1 ? "" : "s"}).`,
        exportEmptyError: "Não há registros filtrados para exportar.",
        exportError: "Não foi possível gerar o arquivo CSV.",
        loadingMessage: "Carregando trilha de auditoria...",
        errorTitle: "Falha ao consultar auditoria",
        errorMessage: "Não foi possível carregar os registros. Tente novamente.",
        retryButton: "Tentar novamente",
        emptyTitle: "Nenhum evento encontrado",
        emptyState: "Nenhum registro de auditoria encontrado para os filtros selecionados.",
        incompleteBadge: "Informação Parcial",
        immutableNotice:
          "Registros de auditoria são estritamente append-only. A imutabilidade é garantida por triggers e políticas RLS do PostgreSQL.",
        severityLabels: {
          info: "Informativo",
          warning: "Aviso",
          critical: "Crítico",
          access_denied: "Acesso negado",
        },
        detailsModal: {
          eyebrow: "AUDITORIA DE SEGURANÇA",
          title: "Detalhes do Evento de Auditoria",
          eventInfoTitle: "Parâmetros do Evento",
          rawMetadataTitle: "Metadados Estruturados (JSON Sanitizado)",
          closeBtn: "Fechar",
          closeAriaLabel: "Fechar modal de auditoria",
          actorLabel: "Operador Responsável:",
          actionLabel: "Ação Realizada:",
          entityTypeLabel: "Tipo de Entidade:",
          entityIdLabel: "Identificador da Entidade:",
          timestampLabel: "Horário UTC / Local:",
          severityLabel: "Classificação:",
          descriptionLabel: "Descrição:",
          reasonLabel: "Justificativa:",
          previousValueLabel: "Valor Anterior:",
          nextValueLabel: "Valor Posterior:",
          targetUserLabel: "Usuário Afetado:",
          integrityComplete: "Íntegro",
          sanitizedBadge: "Higienização ativa",
          loadingMessage: "Carregando detalhes do evento...",
          notFoundMessage: "Evento não localizado.",
          ipNotice: "Dados sensíveis (senhas, chaves, e-mails e tokens) são automaticamente mascarados antes da exibição.",
        },
        actionLabels: {
          "user.role_changed": "Alteração de Papel RBAC",
          "user.role_updated": "Alteração de Papel RBAC",
          "user.suspended": "Suspensão de Conta",
          "user.unsuspended": "Reativação de Conta",
          "resource.approved": "Aprovação de Recurso",
          "resource.rejected": "Rejeição de Recurso",
          "resource.archived": "Arquivamento de Recurso",
          "topic.pin": "Fixação de Tópico",
          "topic.unpin": "Desafixação de Tópico",
          "topic.lock": "Trancamento de Tópico",
          "topic.unlock": "Destrancamento de Tópico",
          "topic.hide": "Ocultação de Tópico",
          "topic.unhide": "Restauração de Tópico",
          "topic.delete": "Exclusão de Tópico",
          "post.hide": "Ocultação de Resposta",
          "post.unhide": "Restauração de Resposta",
          "post.delete": "Exclusão de Resposta",
          "report.reviewing": "Triagem de Denúncia",
          "report.resolved": "Resolução de Denúncia",
          "report.dismissed": "Descarte de Denúncia",
          "research.approved": "Aprovação de Pesquisa",
          "research.rejected": "Rejeição de Pesquisa",
          "research.revision_requested": "Revisão de Pesquisa Solicitada",
          "auth.access_denied": "Acesso Negado Bloqueado",
          "system.config_updated": "Configuração Crítica Atualizada",
          "maintenance.cleanup": "Rotina Automática de Manutenção",
        },
        entityTypeLabels: {
          profile: "Perfil / Usuário",
          resource: "Recurso do Catálogo",
          topic: "Tópico do Fórum",
          post: "Resposta do Fórum",
          report: "Incidente / Denúncia",
          research: "Cybercrime Research",
          system: "Parâmetro do Sistema",
        },
      },
      moderationPage: {
        eyebrow: "TRIAGEM & SEGURANÇA",
        title: "Central de Moderação de Conteúdo",
        subtitle:
          "Fila unificada para análise, validação técnica, aprovação e rejeição fundamentada de recursos, tópicos, respostas e submissões da comunidade.",
        queueTab: "Fila Unificada",
        reportsTab: "Denúncias",
        searchPlaceholder: "Buscar por título, autor, categoria, motivo ou ID...",
        filterType: "Tipo de Conteúdo",
        filterStatus: "Situação",
        filterPriority: "Prioridade",
        filterCategory: "Categoria",
        filterAuthor: "Autor",
        authorPlaceholder: "Filtrar por @autor...",
        filterReports: "Denúncias",
        filterPeriod: "Período",
        clearFiltersBtn: "Limpar filtros",
        allTypes: "Todos os Tipos",
        allStatuses: "Todas as Situações",
        allPriorities: "Todas as Prioridades",
        allCategories: "Todas as Categorias",
        allReports: "Com ou sem denúncias",
        withReportsOnly: "Somente denunciados",
        withoutReportsOnly: "Sem denúncias",
        allPeriods: "Todo o Período",
        period24h: "Últimas 24 Horas",
        period7d: "Últimos 7 Dias",
        period30d: "Últimos 30 Dias",
        typeCol: "Tipo",
        titleCol: "Conteúdo / Título",
        authorCol: "Autor",
        categoryCol: "Categoria",
        submittedCol: "Submetido em",
        updatedCol: "Atualizado em",
        priorityCol: "Prioridade",
        reportsCol: "Denúncias",
        statusCol: "Situação",
        actionsCol: "Ações",
        reviewBtn: "Analisar",
        approveBtn: "Aprovar",
        rejectBtn: "Rejeitar",
        hideBtn: "Ocultar",
        restoreBtn: "Restaurar",
        escalateBtn: "Encaminhar",
        requestRevisionBtn: "Solicitar Revisão",
        resubmitBtn: "Reenviar",
        emptyState: "Nenhum conteúdo encontrado na fila com os filtros selecionados.",
        noQueueItems: "A fila de moderação está vazia no momento.",
        loadError: "Não foi possível carregar a fila de moderação.",
        retryBtn: "Tentar novamente",
        conflictError: "Conflito de estado (409): a ação selecionada é incompatível com o estado atual do item.",
        unauthorizedError: "Acesso negado (42501): apenas moderadores ou administradores ativos podem moderar.",
        incompleteBadge: "Informações Incompletas",
        counterPending: "Itens Pendentes",
        counterTotal: "Total na Fila",
        counterReported: "Com Denúncias",
        counterEscalated: "Encaminhados",
        reportsSectionTitle: "Denúncias Vinculadas aos Conteúdos",
        reportsEmpty: "Nenhuma denúncia encontrada para os filtros atuais.",
        reporterProtected: "Identidade protegida (privacidade)",
        analyzeReportBtn: "Analisar Denúncia",
        statusLabels: {
          pending: "Pendente",
          approved: "Aprovado",
          rejected: "Rejeitado",
          revision_requested: "Revisão Solicitada",
          escalated: "Encaminhado",
          archived: "Arquivado",
          published: "Publicado",
          hidden: "Oculto",
          deleted: "Removido",
        },
        priorityLabels: {
          low: "Baixa",
          medium: "Média",
          high: "Alta",
          critical: "Crítica",
        },
        typeLabels: {
          resource: "Recurso do Catálogo",
          topic: "Tópico do Fórum",
          post: "Resposta do Fórum",
          research: "Cybercrime Research",
        },
        actionLabels: {
          approve: "Aprovação",
          reject: "Rejeição",
          hide: "Ocultação",
          unhide: "Reexibição",
          restore: "Restauração",
          escalate: "Encaminhamento",
          request_revision: "Solicitação de Revisão",
          archive: "Arquivamento",
          delete: "Remoção",
        },
        detailModal: {
          title: "Ficha Técnica do Conteúdo",
          authorLabel: "Autor Comunitário:",
          categoryLabel: "Categoria / Domínio:",
          submittedAtLabel: "Data de Submissão:",
          updatedAtLabel: "Última Atualização:",
          priorityLabel: "Prioridade:",
          reportCountLabel: "Denúncias:",
          flagReasonLabel: "Motivo da Sinalização:",
          urlInspectionTitle: "Inspeção Defensiva de Links Externos",
          urlNonConclusiveNotice:
            "Análise estática e defensiva — nenhum link é acessado automaticamente. Indicadores heurísticos não comprovam atividade ilícita.",
          contentBodyTitle: "Corpo do Conteúdo Submetido",
          historyTitle: "Histórico de Decisões",
          noHistory: "Nenhuma decisão registrada ainda para este item.",
          closeBtn: "Fechar",
        },
        decisionModal: {
          approveTitle: "Aprovar e Publicar Conteúdo",
          rejectTitle: "Rejeitar Conteúdo com Justificativa",
          hideTitle: "Ocultar Conteúdo da Visibilidade Pública",
          restoreTitle: "Restaurar Conteúdo",
          escalateTitle: "Encaminhar para Análise Adicional",
          requestRevisionTitle: "Solicitar Revisão ao Autor",
          approveDesc:
            "A aprovação torna o conteúdo visível na plataforma. Esta ação será registrada no histórico de auditoria.",
          rejectDesc:
            "A rejeição exige justificativa técnica obrigatória (mínimo 5 caracteres).",
          hideDesc:
            "A ocultação remove o conteúdo da listagem pública preservando o registro para auditoria (mínimo 5 caracteres).",
          restoreDesc:
            "Restaura o conteúdo para reavaliação ou visibilidade compatível com seu tipo.",
          escalateDesc:
            "Encaminha o item para análise aprofundada por outro moderador ou administrador (mínimo 5 caracteres).",
          requestRevisionDesc:
            "Solicita ajustes ao autor antes da publicação (mínimo 5 caracteres).",
          reasonLabel: "Justificativa Técnica (Obrigatória) *",
          reasonOptionalLabel: "Observação Técnica (Opcional)",
          reasonPlaceholder:
            "Descreva detalhadamente o motivo da decisão (mínimo 5 caracteres para ações restritivas)...",
          reasonHint: "Mínimo 5 caracteres. Será arquivada para rastreabilidade.",
          reasonMinError: "A justificativa deve conter pelo menos 5 caracteres.",
          generalError: "Erro ao registrar a decisão de moderação. Verifique permissões e estado do item.",
          confirmApproveBtn: "Confirmar Aprovação",
          confirmRejectBtn: "Confirmar Rejeição",
          confirmHideBtn: "Confirmar Ocultação",
          confirmRestoreBtn: "Confirmar Restauração",
          confirmEscalateBtn: "Confirmar Encaminhamento",
          confirmRevisionBtn: "Confirmar Solicitação",
          cancelBtn: "Cancelar",
        },
      },
    },
    resourceTypes: {
      tool: "Ferramenta",
      repository: "Repositório",
      script: "Script",
      framework: "Framework",
      documentation: "Documentação",
      lab: "Laboratório",
      ctf_platform: "Plataforma CTF",
      course: "Curso",
      article: "Artigo Técnico",
    },
    difficulties: {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    },
    languages: {
      en: "Inglês (EN)",
      "pt-BR": "Português (PT-BR)",
      multilingual: "Multilíngue",
      other: "Outro",
    },
  },
  en: {
    nav: {
      home: "Home",
      catalog: "Catalog",
      categories: "Categories",
      forum: "Forum",
      contribute: "Contribute",
      submitResource: "Submit Resource",
      bookmarks: "Bookmarks",
      myContributions: "My Contributions",
      myProfile: "My Profile",
      signIn: "Sign In",
      signUp: "Sign Up",
      signOut: "Sign Out",
      languageLabel: "Switch language",
    },
    hero: {
      eyebrow: "INTERNATIONAL & OPEN-SOURCE PLATFORM",
      titleStart: "Cybersecurity knowledge, tools, and ",
      titleHighlight: "community",
      titleEnd: " in one environment.",
      subtitle:
        "Discover security tools, GitHub repositories, hands-on labs, frameworks, CTF platforms, and discuss technical challenges with students, analysts, and specialists.",
      searchPlaceholder:
        "Search tools, repositories, labs, frameworks (e.g., Wireshark, Sigma, OWASP)...",
      searchButton: "Search",
      allTypes: "All types",
      allDifficulties: "Any difficulty",
      exploreCatalog: "Explore Full Catalog",
      joinForum: "Open Forum",
      stats: {
        categories: "12 Security Domains",
        resourceTypes: "9 Resource Types",
        openSource: "100% Open Source & Curated",
        bilingual: "Bilingual (PT-BR / EN)",
      },
    },
    categoriesSection: {
      eyebrow: "SPECIALIZATION DOMAINS",
      title: "Cybersecurity Categories",
      subtitle:
        "Browse the 12 core domains shared across the resource catalog and the community forum.",
      allFilter: "All categories",
      filterByCategory: "Filter catalog by this category",
    },
    catalogSection: {
      eyebrow: "CURATED DIRECTORY",
      title: "Cybersecurity Resource Catalog",
      subtitle:
        "Tools, open-source repositories, scripts, frameworks, documentation, and hands-on labs reviewed by the community.",
      resultsCount: (count) =>
        count === 1 ? "1 resource found" : `${count} resources found`,
      clearFilters: "Clear filters",
      noResults: "No resources match the selected filters.",
      visitResource: "Official link",
      viewDetails: "Details",
      viewFullCatalog: "View Full Catalog",
      saveBookmark: "Bookmark",
      savedBookmark: "Saved",
      onlyBookmarks: "Bookmarked Only",
      sortLabel: "Sort by",
      sortNewest: "Newest first",
      sortAlphabetical: "Name (A–Z)",
      allLanguages: "All languages",
      authorLabel: "Maintained by",
      publishedAtLabel: "Added on",
      pendingBadge: "Pending Review",
      approvedBadge: "Verified",
    },
    resourceDetail: {
      backToCatalog: "Back to Catalog",
      aboutTitle: "About this resource",
      metadataTitle: "Technical Specifications",
      categoryLabel: "Category",
      typeLabel: "Resource Type",
      difficultyLabel: "Difficulty Level",
      notApplicable: "General / Not applicable",
      languageLabel: "Content Language",
      authorLabel: "Author / Organization",
      publishedDateLabel: "Date Added",
      officialUrlLabel: "Official URL",
      normalizedUrlLabel: "Canonical Key (RFC 3986)",
      openExternalCta: "Open Official Resource",
      securityNotice:
        "Security notice: you are following an external link. Always verify the official domain and run security tools strictly in lab environments or with explicit authorization.",
      relatedTitle: "Related Resources in This Category",
      notFoundTitle: "Resource not found",
      notFoundDesc:
        "The requested resource does not exist in the catalog or is still awaiting moderation approval.",
    },
    submitPage: {
      eyebrow: "COMMUNITY CONTRIBUTION",
      title: "Suggest a New Resource for the Catalog",
      subtitle:
        "Share tools, GitHub repositories, scripts, hands-on labs, or technical documentation. Every submission starts with a pending status for moderator review.",
      nameLabel: "Resource Name *",
      namePlaceholder: "e.g., Zeek Network Security Monitor",
      nameHint: "Between 2 and 120 characters.",
      urlLabel: "Official Link (URL) *",
      urlPlaceholder: "https://github.com/zeek/zeek",
      urlHint:
        "Only http:// or https:// links allowed (checked for duplicates).",
      categoryLabel: "Primary Category *",
      typeLabel: "Resource Type *",
      difficultyLabel: "Difficulty Level",
      difficultyOptional: "Not applicable / General",
      languageLabel: "Resource Language *",
      authorLabel: "Author or Organization",
      authorPlaceholder: "e.g., The Zeek Project / OWASP",
      descriptionLabel: "Technical Description *",
      descriptionPlaceholder:
        "Clearly describe the purpose of the tool, lab, or documentation, main defensive/technical use cases, and target audience...",
      descriptionHint: "Between 10 and 2,000 characters.",
      submitButton: "Submit for Review (Status: Pending)",
      cancelButton: "Back to Catalog",
      moderationBannerTitle: "Curation & Safety Rules",
      moderationBannerBody:
        "Do not submit shortened URLs, dangerous malware without controlled analysis context, leaked credentials, or materials promoting unauthorized attacks.",
      successTitle: "Resource submitted to the moderation queue!",
      successBody:
        "Your resource was recorded with 'pending' status and is immediately visible to you in your local catalog while awaiting moderator approval.",
      viewSubmittedResource: "View Resource Page",
      submitAnother: "Submit Another Resource",
      errors: {
        nameLength: "Name must be between 2 and 120 characters.",
        descriptionLength:
          "Description must be between 10 and 2,000 characters.",
        invalidUrl:
          "Enter a valid URL starting with https:// or http:// (max 2048 chars, no spaces).",
        duplicateUrl:
          "This URL is already listed or pending in the catalog (RFC 3986 check).",
        authorLength: "Author/organization name must be at most 120 characters.",
      },
      authGate: {
        badge: "PROTECTED ACCESS · RLS ACTIVE MEMBER",
        title: "Authentication required to submit resources",
        description:
          "Community resource submission is not open to anonymous visitors. To protect the catalog from spam and unsafe links, only authenticated members with an active account can submit new resources to the moderation queue.",
        rlsNote:
          "Database policy: public.is_active_member() = true AND submitted_by = auth.uid() AND status = 'pending'",
        loginCta: "Sign In to My Account",
        registerCta: "Create Free Account",
        backCatalogCta: "Explore Public Catalog",
        suspendedBadge: "ACCOUNT SUSPENDED · READ-ONLY",
        suspendedTitle: "Your account is currently suspended",
        suspendedDescription:
          "Suspended accounts (is_suspended = true) are restricted to public read-only access. Resource submissions, forum posts, votes, and bookmarks are blocked by security policies.",
        authenticatedBanner: (username, role) =>
          `Authenticated session as @${username} (${role.toUpperCase()}) · Submission linked to your profile.`,
      },
    },
    auth: {
      loginEyebrow: "COMMUNITY ACCESS",
      loginTitle: "Sign In to the Platform",
      loginSubtitle:
        "Access your account to submit catalog resources, save bookmarks, join technical forum discussions, and upvote solutions.",
      registerEyebrow: "MEMBER REGISTRATION",
      registerTitle: "Create a Community Account",
      registerSubtitle:
        "Join cybersecurity students, analysts, and specialists. Your profile adheres to the Supabase schema security constraints.",
      identifierLabel: "Email or Username *",
      identifierPlaceholder: "analyst@example.com or sec_analyst_br",
      emailLabel: "Email *",
      emailPlaceholder: "you@domain.com",
      usernameLabel: "Username *",
      usernamePlaceholder: "e.g., blue_defender_01",
      usernameHint:
        "3 to 30 characters: lowercase letters (a-z), numbers (0-9), and underscores (_) only.",
      displayNameLabel: "Display Name",
      displayNamePlaceholder: "e.g., Ana Silva (SOC Analyst)",
      displayNameHint: "Optional, up to 80 characters.",
      passwordLabel: "Password *",
      passwordPlaceholder: "Minimum 8 characters",
      passwordHint:
        "Use at least 8 characters combining letters and numbers/symbols.",
      confirmPasswordLabel: "Confirm Password *",
      confirmPasswordPlaceholder: "Repeat your password",
      preferredLanguageLabel: "Preferred Interface Language *",
      ethicsCheckboxLabel:
        "I commit to the platform's ethical guidelines: using and sharing knowledge strictly for cyber defense, education, and explicitly authorized security testing.",
      signInButton: "Sign In",
      signingInButton: "Signing in...",
      retrySignOut: "Retry sign out",
      signUpButton: "Create Member Account",
      githubButton: "Continue with GitHub (OAuth)",
      orDivider: "or continue with credentials",
      noAccountPrompt: "New to the community?",
      createAccountLink: "Create an account now",
      hasAccountPrompt: "Already have a registered account?",
      signInLink: "Sign in",
      demoAccountsTitle: "Quick Profile Switcher (Pre-Supabase Mode)",
      demoAccountsSubtitle:
        "Immediately test the authorization gates across different roles (Active Member, Moderator, or Suspended Account):",
      demoMemberBtn: "Sign in as Member (@sec_analyst_br)",
      demoModeratorBtn: "Sign in as Moderator (@mod_sentinel)",
      demoAdminBtn: "Sign in as Administrator (@root_admin)",
      demoSuspendedBtn: "Test Suspended Account (@suspended_user)",
      alreadySignedInTitle: "You are already signed in",
      alreadySignedInBody: (username) =>
        `Your session is active as @${username}. You can continue browsing or sign out of the current session.`,
      continueToApp: "Go to Catalog",
      forgotPasswordLink: "Forgot your password?",
      forgotPasswordPage: {
        eyebrow: "ACCESS RECOVERY",
        title: "Recover Password",
        subtitle:
          "Enter the email associated with your Vexor account to receive a verification code.",
        emailLabel: "Registered Email *",
        emailPlaceholder: "analyst@example.com",
        emailHint: "We will send a temporary numeric code so you can reset your password right here.",
        submitButton: "Send Recovery Code",
        submittingButton: "Sending code...",
        antiEnumerationNotice:
          "If an account is associated with this email, a verification code has been dispatched. Please check your inbox and spam folder.",
        simulationNotice:
          "Development Environment: In production, emails are dispatched via Supabase Auth with signed tokens and 1-hour expiration.",
        simulationLinkCta: "Open test reset screen →",
        backToLogin: "Back to sign in",
        otpLabel: "Verification Code *",
        otpPlaceholder: "000000",
        otpHint: "Enter the 6-digit code received in your email.",
        verifyAndResetButton: "Verify Code & Update Password",
        verifyingAndResettingButton: "Verifying code & saving password...",
        resendCodeButton: "Resend code",
        changeEmailButton: "Change email",
        invalidOtpError: "Invalid verification code. Check the digits and try again.",
        expiredOtpError: "This code has expired. Click \"Resend code\" to get a new one.",
      },
      resetPasswordPage: {
        eyebrow: "CREDENTIAL RESET",
        title: "Set New Password",
        subtitle:
          "Create a strong new password to regain access to the Vexor platform.",
        newPasswordLabel: "New Password *",
        newPasswordPlaceholder: "Minimum 8 characters",
        newPasswordHint: "Combine uppercase, lowercase, digits, and special symbols.",
        confirmPasswordLabel: "Confirm New Password *",
        confirmPasswordPlaceholder: "Repeat the new password",
        submitButton: "Update Password",
        submittingButton: "Saving new credential...",
        successTitle: "Password Successfully Updated!",
        successMessage:
          "Your credential has been securely reset. You can now continue with your session or sign in with your new password.",
        backToLogin: "Go to sign in",
        continueToCatalog: "Go to Catalog",
        verifyingSession: "Validating secure recovery session...",
        invalidSessionTitle: "Invalid or expired recovery link",
        invalidSessionMessage:
          "We could not verify an active password recovery session. Please request a new recovery link.",
        requestNewLink: "Request new link",
        showPassword: "Show password",
        hidePassword: "Hide password",
        strengthTitle: "Password Strength:",
        passwordsMatch: "✓ Passwords match",
        passwordsDoNotMatch: "✕ Does not match",
        strengthLabels: {
          weak: "Weak",
          fair: "Fair",
          good: "Good",
          strong: "Strong (Recommended)",
        },
        requirements: {
          minChars: "At least 8 characters",
          hasNumber: "At least one digit (0-9)",
          hasSpecial: "At least one special symbol (!@#$%...)",
        },
      },
      errors: {
        invalidIdentifier: "Please enter your email or username to sign in.",
        invalidEmail: "Please enter a valid email address.",
        invalidUsername:
          "Invalid username: use 3 to 30 characters with lowercase letters, numbers, or '_' only (regex ^[a-z0-9_]{3,30}$).",
        usernameTaken: "This username is already taken by another member.",
        emailTaken: "This email address is already registered.",
        displayNameLength:
          "Display name is required and must be between 1 and 60 characters.",
        passwordLength: "Password must be at least 8 characters long.",
        passwordMismatch: "Password confirmation does not match.",
        ethicsRequired:
          "You must accept the ethical use and defensive security commitment.",
        invalidCredentials:
          "Invalid credentials or unconfirmed email. Please check your email and password.",
        networkError:
          "Unable to reach the authentication service. Please try again shortly.",
        rateLimited:
          "Too many sign-in attempts. Please wait a moment before trying again.",
        profileMissing:
          "Your account authenticated, but no matching profile was found. Please contact support.",
        accountSuspended:
          "Your account is currently suspended. Access to protected features is blocked.",
        logoutFailed:
          "Unable to confirm sign-out with the server. Please try signing out again.",
        recoverySessionInvalid:
          "Recovery session is missing or expired. Please request a new password reset link.",
        weakPassword:
          "The password does not meet the minimum security requirements.",
        samePassword:
          "The new password must be different from your previous password.",
        passwordUpdateFailed:
          "Unable to update your password. Please try again shortly.",
      },
    },
    forumSection: {
      eyebrow: "KNOWLEDGE EXCHANGE",
      title: "Technical Forum Discussions",
      subtitle:
        "Ask questions, share lab setups, upvote helpful answers, and track threads with verified solutions.",
      newTopicCta: "Create New Topic",
      solvedBadge: "Accepted Solution",
      repliesLabel: "replies",
      votesLabel: "votes",
      byAuthor: "by",
    },
    forumPage: {
      eyebrow: "COMMUNITY & TECHNICAL DEBATE",
      title: "Cybersecurity Forum",
      subtitle:
        "Join technical discussions, troubleshoot hands-on labs and security tools, share findings, and collaborate with specialists.",
      searchPlaceholder:
        "Search topics, questions, or keywords (e.g., SIEM, reverse engineering, exploit)...",
      allCategories: "All categories",
      allTags: "All tags",
      sortLatest: "Latest",
      sortTopVoted: "Top Voted",
      sortUnanswered: "Unanswered",
      sortSolved: "Solved",
      pinnedBadge: "Pinned",
      lockedBadge: "Locked",
      noTopicsFound: "No topics found matching your search criteria.",
      clearFilters: "Clear filters",
      resultsCount: (count) =>
        count === 1 ? "1 topic found" : `${count} topics found`,
      newTopicCta: "Create New Topic",
    },
    topicDetailPage: {
      backToForum: "Back to Forum",
      pinnedNotice: "Topic pinned by community moderators.",
      lockedNotice: "This topic has been locked for new replies by moderation.",
      upvoteTopic: "Upvote topic",
      upvotedTopic: "Upvoted",
      repliesTitle: (count) =>
        count === 1 ? "1 Technical Reply" : `${count} Technical Replies`,
      noRepliesYet:
        "No replies on this topic yet. Be the first to share a technical analysis or solution!",
      acceptedSolutionBadge: "Accepted Solution by Author",
      markAsAccepted: "Mark as accepted solution",
      unmarkAccepted: "Unmark accepted",
      replyFormTitle: "Your Technical Reply",
      replyPlaceholder:
        "Describe your technical analysis, reproduction steps, CLI commands, or verified solution. Markdown code blocks are supported...",
      replyHint:
        "Between 1 and 10,000 characters. Use clear Markdown formatting with code blocks.",
      previewTab: "Preview",
      writeTab: "Write",
      sendReplyButton: "Post Reply",
      replySuccess: "Your reply has been posted successfully!",
      authRequiredToReply:
        "You must be signed in with an active account to post replies in this discussion.",
      loginToReply: "Sign in to reply",
      suspendedReplyBlocked:
        "Your account is suspended and has read-only access.",
      sortRepliesTop: "Top Voted",
      sortRepliesOldest: "Oldest",
      sortRepliesNewest: "Newest",
    },
    newTopicPage: {
      eyebrow: "NEW DISCUSSION",
      title: "Create Forum Topic",
      subtitle:
        "Start a technical debate, ask for assistance with an analysis, or share defensive methodologies with the Vexor community.",
      titleLabel: "Topic Title *",
      titlePlaceholder:
        "e.g., Analyzing persistence via scheduled tasks in Windows Server",
      titleHint: "Between 5 and 200 characters. Be specific and descriptive.",
      categoryLabel: "Technical Category *",
      categoryHint: "Select the primary security domain for this thread.",
      tagsLabel: "Technical Tags (up to 5 tags)",
      tagsPlaceholder: "e.g., windows, sysmon, dfir, persistence",
      tagsHint:
        "Comma or space separated. Lowercase letters, numbers, and hyphens (e.g., red-team).",
      bodyLabel: "Detailed Content (Markdown) *",
      bodyPlaceholder:
        "Provide context, lab environment details, logs, reproduction steps, commands, and expected outputs...",
      bodyHint:
        "Between 10 and 20,000 characters. Full support for safe Markdown.",
      writeTab: "Write",
      previewTab: "Preview",
      cancelButton: "Cancel",
      submitButton: "Publish Topic",
      guidelinesTitle: "Forum Quality Guidelines",
      guidelinesBody:
        "Do not share real-world credentials, destructive payloads, or unauthorized targets. Adhere strictly to ethical defensive security standards.",
      authRequiredTitle: "Authentication Required",
      authRequiredBody:
        "Only active community members can publish new forum discussions.",
      loginCta: "Sign In",
      registerCta: "Create Account",
      suspendedTitle: "Account Suspended",
      suspendedBody:
        "Suspended accounts do not have permission to publish new topics.",
      errors: {
        titleLength: "Title must be between 5 and 200 characters.",
        bodyLength: "Content must be between 10 and 20,000 characters.",
        categoryRequired: "Please select a valid category.",
        tagsLimit: "You can specify at most 5 tags.",
        tagFormat:
          "Tags must contain only lowercase letters, numbers, and hyphens (1 to 30 characters).",
      },
    },
    contributeSection: {
      eyebrow: "COMMUNITY-DRIVEN",
      title: "How community contributions work",
      subtitle:
        "Any authenticated member can suggest tools, scripts, repositories, and learning resources.",
      steps: {
        step1Title: "1. Submit a Resource",
        step1Desc:
          "Provide the name, description (up to 2,000 chars), category, type, difficulty level, and validated official link.",
        step2Title: "2. Moderation Review",
        step2Desc:
          "Submissions enter as pending and are reviewed by moderators to verify quality and safety.",
        step3Title: "3. Public Publication",
        step3Desc:
          "Once approved, the resource becomes publicly searchable in the catalog with contributor attribution.",
      },
      ctaPrimary: "Suggest a Resource",
      securityNote:
        "Ethical guideline: platform strictly dedicated to learning, defensive security, and authorized research.",
    },
    footer: {
      description:
        "International, open-source community platform centralizing cybersecurity tools, hands-on labs, documentation, and technical discussions.",
      ethicsTitle: "Ethical Use & Authorized Security",
      ethicsBody:
        "All content is intended for educational purposes, authorized testing, and cyber defense. Hosting dangerous malware, leaking credentials, or encouraging unauthorized attacks is strictly prohibited.",
      navigationTitle: "Platform",
      communityTitle: "Community",
      rights:
        "© 2026 Vexor · Open-Source Cybersecurity Community Platform.",
    },
    pagination: {
      previous: "Previous",
      next: "Next",
      pageOf: (current, total) => `Page ${current} of ${total}`,
      showing: (start, end, total) =>
        `Showing ${start}–${end} of ${total} resources`,
    },
    bookmarksPage: {
      eyebrow: "PERSONAL COLLECTION",
      title: "Saved Resources",
      subtitle:
        "Quickly access all tools, repositories, labs, and technical guides you have starred.",
      emptyTitle: "No saved resources yet",
      emptyDesc:
        "You haven't bookmarked any resources yet. Click the star icon on any catalog card to save items to your collection.",
      exploreCta: "Explore Catalog",
      backToCatalog: "Back to Catalog",
      countLabel: (count) =>
        count === 1 ? "1 saved resource" : `${count} saved resources`,
      clearAll: "Clear Bookmarks",
      removeBookmark: "Remove from bookmarks",
    },
    profilePage: {
      eyebrow: "MEMBER PROFILE",
      title: "My Profile",
      subtitle: "Manage your identity, community reputation, contributions, and account settings on Vexor.",
      publicSubtitle: (username: string) => `Public profile and technical contributions of @${username} on Vexor.`,
      editProfileButton: "Edit Profile",
      joinedDate: (date: string) => `Member since ${date}`,
      reputationScore: "Reputation Points",
      reputationLabel: "Vexor Score",
      tabs: {
        overview: "Overview",
        topics: "Topics",
        replies: "Replies",
        contributions: "Contributions",
        badges: "Achievements",
        settings: "Account & Security",
      },
      stats: {
        topics: "Topics Created",
        replies: "Technical Replies",
        acceptedSolutions: "Accepted Solutions",
        contributions: "Suggested Resources",
        upvotes: "Upvotes Received",
        reputation: "Total Reputation",
      },
      aboutTitle: "About",
      bioEmpty: "No bio provided yet. Click Edit Profile to add a technical description.",
      interestsTitle: "Technical Interest Areas",
      interestsEmpty: "No interests selected.",
      socialTitle: "Professional Connections",
      noSocial: "No social profiles linked.",
      notFoundTitle: "Member Not Found",
      notFoundDesc: "The requested user profile does not exist or has been removed.",
      backHome: "Back to Home",
      authRequiredTitle: "Authentication Required",
      authRequiredDesc: "You must be signed in to your Vexor account to view your personal profile.",
      loginCta: "Sign In",
      registerCta: "Create Account",
      editModal: {
        title: "Edit Profile",
        subtitle: "Update your public information following Vexor community standards.",
        displayNameLabel: "Display Name",
        displayNamePlaceholder: "e.g. Lucas Mendes (SOC Analyst)",
        bioLabel: "Professional Bio",
        bioPlaceholder: "Summary of your security focus, favorite defensive tools, or areas of study...",
        avatarUrlLabel: "Avatar URL (HTTPS)",
        avatarUrlPlaceholder: "https://...",
        avatarSectionLabel: "Profile Photo (Avatar)",
        avatarSelectButton: "Select image",
        avatarChangeButton: "Change image",
        avatarCancelSelection: "Cancel selection",
        avatarHint: "PNG, JPEG, or WEBP · max 2 MB (SVG blocked)",
        avatarUploading: "Uploading image & saving...",
        avatarPreviewAlt: "Avatar preview",
        githubUrlLabel: "GitHub Profile",
        githubUrlPlaceholder: "https://github.com/your-username",
        linkedinUrlLabel: "LinkedIn Profile",
        linkedinUrlPlaceholder: "https://linkedin.com/in/your-username",
        interestsLabel: "Interest Areas (up to 10)",
        interestsPlaceholder: "Comma separated (e.g., Threat Hunting, DFIR, SIEM, Sysmon)",
        interestsHint: "Press comma or Enter to add technical focus areas.",
        languageLabel: "Preferred Platform Language",
        cancelButton: "Cancel",
        saveButton: "Save Changes",
        savingButton: "Saving...",
        successMessage: "Profile updated successfully!",
      },
      settings: {
        title: "Account Settings",
        accountSubtitle: "Account registration details and secure credentials.",
        emailLabel: "Registered Email",
        emailHint: "Private. Your email is never exposed publicly to other members.",
        roleLabel: "Permission Level",
        roleHint: "Assigned role in the community. Privilege escalation is managed by administrators.",
        statusLabel: "Account Status",
        activeStatus: "Active & Good Standing",
        suspendedStatus: "Suspended",
        mfaTitle: "Two-Factor Authentication (2FA)",
        mfaSubtitle: "Additional layer of protection for your Vexor account.",
        mfaBadge: "Available via Supabase Auth integration",
        signOutButton: "Sign Out",
      },
      emptyStates: {
        topics: "No forum topics created by this member yet.",
        replies: "No technical replies published in the forum yet.",
        contributions: "No catalog resources contributed by this member yet.",
      },
    },
    myContributionsPage: {
      eyebrow: "MY DEFENSIVE WORKSPACE",
      title: "My Contributions & Activities",
      subtitle:
        "Track your catalog submissions, technical forum discussions, and learning timeline on Vexor.",
      tabs: {
        overview: "Overview",
        contributions: "My Contributions",
        activities: "My Activities",
      },
      stats: {
        totalSubmitted: "Resources Submitted",
        approved: "Approved",
        pending: "Under Review",
        rejected: "Rejected",
        approvalRate: "Approval Rate",
        forumTopics: "Topics Created",
        forumReplies: "Technical Replies",
        acceptedSolutions: "Accepted Solutions",
        vexorScore: "Vexor Score",
      },
      quickActions: {
        submitResource: "+ Submit Resource to Catalog",
        createTopic: "+ Create Topic in Forum",
        viewProfile: "View Public Profile",
      },
      subTabs: {
        catalogResources: "Catalog Resources",
        forumTopics: "Forum Topics",
        forumReplies: "Technical Replies",
      },
      filters: {
        allStatuses: "All statuses",
        approved: "Approved",
        pending: "Under Review",
        rejected: "Rejected",
        allTypes: "All types",
        allCategories: "All categories",
        allActivities: "All activities",
        catalog: "Catalog",
        forum: "Forum",
        bookmarks: "Bookmarks",
        profile: "Profile",
        periodAll: "All time",
        periodToday: "Today",
        periodWeek: "This week",
        periodMonth: "This month",
      },
      rejectionReasonLabel: "Moderation Feedback",
      timelineTitle: "Activity Timeline",
      timelinePrivacyNote:
        "🔒 Privacy: This personal timeline is strictly visible to you.",
      timelineAuditNote:
        "Audit Note: Clearing the visual timeline only removes local client entries. Formal system security records (audit_logs) remain immutable in PostgreSQL for compliance.",
      clearTimelineBtn: "Clear Visual History",
      clearTimelineConfirm: "Do you really want to clear the timeline view?",
      emptyStates: {
        catalog:
          "You haven't submitted any resources to the catalog yet. Suggest a tool, repo, or hands-on lab!",
        topics:
          "You haven't started any forum discussions yet. Share an analysis or start a technical debate!",
        replies:
          "You haven't posted any replies in the forum yet. Collaborate with the community by helping others!",
        activities:
          "No activities recorded in the selected period.",
      },
      authRequiredTitle: "Restricted Access",
      authRequiredDesc:
        "You must be signed in to your account to view your contributions and activities.",
    },
    cybercrimeResearchPage: {
      eyebrow: "THREAT INTELLIGENCE & DFIR",
      title: "Cybercrime Research",
      subtitle:
        "Technical analysis, threat intelligence reports, malware reverse engineering, and cybercrime group tracking produced and peer-reviewed by the community.",
      searchPlaceholder: "Search by threat actor, malware family, CVE, or ATT&CK technique...",
      allTopics: "All Research Domains",
      allThreatLevels: "All Severity Levels",
      submitResearchCta: "+ Submit Technical Analysis",
      discussInForumCta: "Discuss in Technical Forum",
      emptyResults: "No reports or research found matching the selected filters.",
      clearFilters: "Clear Filters",
      tlpLabel: "TLP Protocol",
      techniquesLabel: "MITRE ATT&CK Techniques",
      readReport: "Read Full Report",
      publishedDate: "Published on",
      authorLabel: "Researcher",
      pillarsTitle: "Two Core Strategic Research Pillars",
      pillarsSubtitle:
        "From forensic autopsy of incidents to underground monetization syndicates and clandestine marketplaces.",
      spacesTitle: "Four Technical Content Spaces",
      spacesSubtitle:
        "Explore peer-reviewed publications, forensic case studies, scientific discussions, and hardened analysis labs.",
      categoriesTitle: "Ten Official Research Taxonomies",
      categoriesSubtitle:
        "Structured classification framework mapping threat vectors, threat actors, and defensive engineering.",
      disclaimerTitle: "Ethical Charter & Operational Guidelines",
      disclaimerBody:
        "Vexor is strictly an educational and defensive research ecosystem. Investigating cybercrime serves to fortify global infrastructure, protect victims, and train security defenders. We do not provide weaponized exploits or facilitate unlawful operations.",
      librarySpaceTitle: "Research Library",
      librarySpaceDesc:
        "Centralized repository of peer-reviewed threat reports, reverse engineering notes, and technical articles.",
      casesSpaceTitle: "Case Studies",
      casesSpaceDesc:
        "Forensic post-mortems of notorious security incidents detailing timelines, access vectors, IoCs, and mitigations.",
      discussionsSpaceTitle: "Technical Discussions",
      discussionsSpaceDesc:
        "Community scientific exchange for threat hunting, TTP correlation, and defensive telemetry validation.",
      labsSpaceTitle: "Analysis Labs",
      labsSpaceDesc:
        "Hands-on sandbox guides, hardened hypervisor setups, malware triage workflows, and mandatory OPSEC rules.",
      exploreSpaceCta: "Enter Space",
      viewCategoryCta: "View Category",
      viewAllCta: "View All",
      accessRestricted: {
        eyebrow: "RESTRICTED ACCESS · CYBERCRIME INTELLIGENCE",
        title: "Restricted Area for Authorized Members",
        subtitle:
          "Cybercrime Research is a closed technical environment for cyber incident investigations, forensic autopsies, and underground intelligence. Access to reports, technical discussions, and analysis labs is exclusive to registered and authenticated members.",
        loginButton: "Sign In",
        registerButton: "Register",
        backHomeButton: "Back to Home",
        simulationNotice:
          "Demonstrative Environment: Access checks are currently simulated at the client/frontend layer and do not replace true server-side security authorization to be enforced via Supabase and PostgreSQL RLS.",
        suspendedBanner:
          "Account Notice: Your account is suspended. You are barred from viewing or submitting research until your profile is reinstated.",
        suspendedEyebrow: "ACCOUNT SUSPENDED · ACCESS BLOCKED",
        suspendedTitle: "Access Denied: Restricted Account",
        suspendedDesc:
          "Your account is currently suspended and does not have permission to view Cybercrime Research technical papers, forensic post-mortems, or analysis labs. Contact moderation to review your profile status.",
      },
    },
    adminPanel: {
      sidebar: {
        title: "Moderation & Management Panel",
        dashboard: "Overview",
        moderation: "Moderation Center",
        catalog: "Catalog Moderation",
        forum: "Forum Moderation",
        research: "Cybercrime Research",
        reports: "Reports Desk",
        users: "User Management",
        audit: "Audit Logs",
        backToSite: "Back to Platform",
        roleAdminBadge: "ROOT ACCESS",
        roleModBadge: "MODERATOR",
        adminOnlyBadge: "Admin",
      },
      accessDenied: {
        title: "Restricted Access",
        subtitle:
          "This area is strictly reserved for moderators and administrators of the Vexor community.",
        loginRequiredTitle: "Authentication Required",
        loginRequiredSubtitle:
          "You must be signed in with an authorized account to view and manage the administration panel.",
        suspendedTitle: "Account Under Moderation / Suspended",
        suspendedSubtitle:
          "Your account is currently under active administrative suspension. All elevated permissions and panel accesses are revoked.",
        memberTitle: "Insufficient Privileges (Access Denied)",
        memberSubtitle:
          "Your account has standard Member privileges. Administrative access requires Moderator or Administrator credentials according to Vexor's RBAC policy.",
        loginButton: "Sign in with another account",
        backHomeButton: "Return to Home",
        securityNotice:
          "Security Advisory: This screen represents a visual client-side access denied state. Authoritative security enforcement will be implemented subsequently on the server and PostgreSQL via Supabase Auth and Row Level Security (RLS).",
      },
      breadcrumbs: {
        admin: "Admin",
        dashboard: "Overview",
        catalog: "Catalog",
        forum: "Forum",
        research: "Cybercrime Research",
        reports: "Reports",
        users: "Users",
        audit: "Audit",
      },
      badges: {
        pending: (count: number) => `${count} pending`,
        open: (count: number) => `${count} open`,
        reviewing: (count: number) => `${count} in review`,
      },
      dashboard: {
        eyebrow: "GOVERNANCE & MODERATION CONSOLE",
        title: "Dashboard",
        subtitle:
          "Community overview, publications, moderation queue, reports, and recent administrative activity.",
        greeting: (name: string) => `Hello, ${name}`,
        currentDateLabel: "Current date",
        refreshButton: "Refresh data",
        refreshingButton: "Refreshing...",
        loadingMessage: "Loading administrative indicators and recent events...",
        errorTitle: "Failed to load dashboard",
        errorMessage:
          "Unable to query administrative services right now. Please try refreshing again.",
        retryButton: "Try again",
        statsTitle: "Key Indicators",
        alertsTitle: "Administrative Alerts & Priorities",
        queueTitle: "Moderation Queue",
        auditTitle: "Recent Activity",
        noHistoricalTrends:
          "Metrics consolidated directly from the database; percentage trends are not shown.",
        viewReportsCta: "Reports Desk",
        viewCatalogCta: "Admin Catalog",
        viewQueueCta: "Go to Moderation",
        metrics: {
          totalUsersTitle: "Total Users",
          totalUsersDesc: (suspended: number) =>
            suspended === 1
              ? "1 suspended account recorded"
              : `${suspended} suspended accounts recorded`,
          activeUsersTitle: "Active Users",
          activeUsersDesc: "Enabled accounts on the platform",
          publicationsTitle: "Publications",
          publicationsDesc: (resources: number, topics: number) =>
            `${resources} resources · ${topics} topics`,
          pendingReportsTitle: "Pending Reports",
          pendingReportsDesc: (count: number) =>
            count === 0 ? "No pending reports" : "Awaiting triage",
          pendingResourcesTitle: "Resources Pending Approval",
          pendingResourcesDesc: (count: number) =>
            count === 0 ? "Catalog up to date" : "Awaiting technical review",
          moderationQueueTitle: "Moderation Queue Items",
          moderationQueueDesc: (count: number) =>
            count === 0 ? "Moderation queue clear" : "Pending review",
        },
        recentActivity: {
          title: "Recent Activity",
          viewAllCta: "View full audit log",
          empty: "No administrative events recorded yet.",
          operatorLabel: "Operator",
          targetLabel: "Target",
        },
        moderationPreview: {
          title: "Moderation Queue Preview",
          viewAllCta: "Open moderation page",
          empty: "No pending items in the moderation queue.",
          readOnlyNotice: "Read-only preview — moderation decisions are performed on the moderation page.",
          submittedLabel: "Submitted",
          contentTypes: {
            resource: "Resource",
            topic: "Topic",
            post: "Reply",
            research: "DFIR Research",
          },
          statuses: {
            pending: "Pending",
            revision_requested: "Revision requested",
            published: "Published",
            approved: "Approved",
            rejected: "Rejected",
            hidden: "Hidden",
          },
        },
        reportsPreview: {
          title: "Recent Reports",
          viewAllCta: "Open reports",
          empty: "No pending reports at the moment.",
          pendingCountBadge: (count: number) => `${count} pending`,
          receivedLabel: "Received",
          privacyNotice: "Reporter identity is omitted in this preview.",
        },
        pendingResourcesPreview: {
          title: "Resources Awaiting Approval",
          viewAllCta: "Open admin catalog",
          empty: "No resources awaiting approval in the catalog.",
          categoryLabel: "Category",
          submittedLabel: "Submitted",
          statusPending: "Awaiting approval",
        },
      },
      alerts: {
        urgentReports: (count: number) =>
          `Urgent: ${count} open report${count === 1 ? "" : "s"} require immediate technical triage.`,
        pendingResources: (count: number) =>
          `Catalog: ${count} resource${count === 1 ? "" : "s"} awaiting moderator review.`,
        pendingResearch: (count: number) =>
          `DFIR Research: ${count} threat intelligence submission${count === 1 ? "" : "s"} pending peer-review.`,
        recentSuspensions: (count: number) =>
          `Security: ${count} account${count === 1 ? "" : "s"} placed under preventative suspension recently.`,
        systemHealthy: "Operational status optimal: no critical bottlenecks in the moderation pipeline.",
      },
      queue: {
        tabs: {
          all: "All Pending Items",
          catalog: "Catalog",
          reports: "Reports",
          forum: "Forum",
          research: "DFIR Research",
        },
        emptyState: "No items pending moderation in this category.",
        viewDetails: "Details & Context",
        authorLabel: "Author / Submitter",
        submittedLabel: "Submitted At",
        targetLabel: "Target Type",
        reasonLabel: "Reason / Context",
        statusLabel: "Current Status",
        actionApprove: "Approve & Publish",
        actionReject: "Reject Submission",
        actionResolve: "Handle Report",
        actionReview: "Mark as Under Review",
        reasonRequired: "A technical justification note is mandatory for this decision.",
        successAction: "Moderation action recorded successfully to the immutable audit trail.",
      },
      reportsPage: {
        eyebrow: "MODERATION & INTEGRITY",
        title: "Reports Desk",
        subtitle:
          "Triage and resolution of policy infractions, terms violations, spam, and potentially malicious content reported by members.",
        filterStatus: "Filter by Status",
        filterReason: "Filter by Reason",
        filterTarget: "Filter by Target Type",
        allStatuses: "All Statuses",
        allReasons: "All Reasons",
        allTargets: "All Targets",
        emptyState: "No reports found matching the selected filters.",
        reportedItem: "Reported Item",
        reportedBy: "Reporter",
        handledBy: "Handled by",
        detailsLabel: "Details provided in the report",
        resolutionNoteLabel: "Technical Resolution Note",
        resolveBtn: "Triage / Resolve",
        modalTitle: "Handle Report",
        modalDesc:
          "Set the new report status and record a clear technical resolution note. This decision will be permanently logged to the audit trail.",
        decisionLabel: "Decision / New Status *",
        justificationPlaceholder:
          "Detail the reason for resolution, action taken on content (e.g., hidden, warned, dismissed as unfounded)...",
        justificationHint: "Minimum 5 characters. Security audited record.",
        cancelBtn: "Cancel",
        confirmBtn: "Record Resolution",
        statusLabels: {
          open: "Open",
          reviewing: "Under Review",
          resolved: "Resolved (Infraction Confirmed)",
          dismissed: "Dismissed (Unfounded)",
        },
        reasonLabels: {
          spam: "Spam or Unsolicited Commercial Promotion",
          malicious_content: "Insecure Content or Potential Malware",
          personal_data: "PII / Data Leakage",
          harassment: "Aggressive Conduct or Harassment",
          unauthorized_attack: "Unauthorized Attack / Illicit Usage",
          copyright: "Copyright Violation",
          other: "Other Reason",
        },
        targetLabels: {
          topic: "Forum Topic",
          post: "Forum Reply",
          resource: "Catalog Resource",
          profile: "User Profile",
        },
      },
      usersPage: {
        eyebrow: "ACCESS CONTROL & SECURITY",
        title: "User Management",
        rbacTitle: "User Management (RBAC)",
        subtitle:
          "Browse, search, and filter community accounts, access roles, and account status.",
        refreshButton: "Refresh data",
        refreshingButton: "Refreshing...",
        loadingMessage: "Loading users...",
        errorTitle: "Failed to load users",
        errorMessage:
          "Unable to query the administrative users service right now. Please try again.",
        retryButton: "Try again",
        summary: {
          totalUsers: "Total users",
          activeUsers: "Active users",
          suspendedUsers: "Suspended users",
          admins: "Administrators",
          moderators: "Moderators",
        },
        searchLabel: "Search by name or username",
        searchPlaceholder: "Search by name or @username...",
        filterRole: "Filter by Role",
        filterStatus: "Filter by Status",
        filterPeriod: "Registration period",
        allRoles: "All roles",
        allStatuses: "All statuses",
        allPeriods: "All time",
        period7d: "Last 7 days",
        period30d: "Last 30 days",
        period90d: "Last 90 days",
        clearFiltersBtn: "Clear filters",
        resultsCount: (shown: number, total: number) =>
          `Showing ${shown} of ${total} user${total === 1 ? "" : "s"}`,
        pageSizeLabel: "Per page",
        pageIndicator: (page: number, totalPages: number) =>
          `Page ${page} of ${totalPages}`,
        prevPageBtn: "Previous",
        nextPageBtn: "Next",
        statusActive: "Active",
        statusSuspended: "Suspended",
        sortLabel: "Sort",
        sortNewest: "Newest first",
        sortOldest: "Oldest first",
        sortAlpha: "Name (A-Z)",
        userCol: "User",
        roleCol: "Role",
        statusCol: "Status",
        createdCol: "Joined",
        activityCol: "Activity",
        actionsCol: "Actions",
        noActivity: "No recent activity",
        viewDetailsBtn: "Details",
        changeRoleBtn: "Change role",
        suspendBtn: "Suspend user",
        unsuspendBtn: "Reactivate user",
        emptyTitle: "No users found",
        emptyState: "No users found matching the selected filters.",
        selfBadge: "Your Account",
        roleLabels: {
          member: "Member",
          moderator: "Moderator",
          admin: "Admin",
        },
        adminActions: {
          title: "Administrative actions",
          badge: "RBAC",
          notice:
            "Actions below are applied to the database through authenticated administrative RPCs and recorded in the audit trail.",
          selfProtected: "Administrators cannot demote or suspend their own account.",
          lastAdminProtected: "The last active administrator cannot be demoted or suspended.",
        },
        detailsModal: {
          title: "User Details",
          publicInfoTitle: "Public Profile Information",
          bioEmpty: "No biography registered.",
          interestsEmpty: "No interests specified.",
          closeBtn: "Close",
          loadingMessage: "Loading user record...",
          notFoundTitle: "User not found",
          notFoundMessage:
            "The requested record was not found.",
          joinedLabel: "Joined date",
          lastActivityLabel: "Last activity",
          publicLinksTitle: "Public links",
          noPublicLinks: "No public links provided.",
          activityTitle: "User administrative history",
          noRecentActivity: "No recent administrative events for this user.",
        },
        roleModal: {
          eyebrow: "RBAC GOVERNANCE",
          title: "Change User Role",
          desc: "Changing a role applies the new permissions in the database and records a user.role_changed event in the audit trail.",
          currentRoleLabel: "Current Role:",
          newRoleLabel: "New RBAC Role *",
          targetRoleLabel: "Target Role:",
          currentBadge: "Current",
          selfProtectedBadge: "Self-demotion blocked",
          lastAdminWarning:
            "Operation blocked: you cannot demote the last active administrator.",
          selfDemoteWarning:
            "Administrators cannot demote their own account.",
          warningAdmin:
            "Warning: Granting the 'admin' role provides full administrative control across the platform environment.",
          confirmStepTitle: "Confirm role change",
          confirmStepDesc: (username: string, fromRole: string, toRole: string) =>
            `Confirm the role change for @${username} from ${fromRole} to ${toRole}?`,
          confirmActionBtn: "Confirm and apply",
          backBtn: "Back",
          processingBtn: "Processing...",
          successMessage: "Role updated successfully.",
          sameRoleError: "Select a role different from the current role.",
          roleDescriptions: {
            member:
              "Standard community access: reading, participating in topics, and submitting resources.",
            moderator:
              "Moderation powers: reviewing resources, topics, posts, and community reports.",
            admin:
              "Full administrative control: RBAC role governance, suspensions, and auditing.",
          },
          cancelBtn: "Cancel",
          confirmBtn: "Review change",
          closeAriaLabel: "Close modal",
        },
        suspensionModal: {
          suspendEyebrow: "ADMINISTRATIVE SANCTION",
          unsuspendEyebrow: "ADMINISTRATIVE REACTIVATION",
          suspendTitle: "Suspend User Account",
          unsuspendTitle: "Reactivate User Account",
          suspendDesc:
            "Suspension revokes the user's ability to interact in the community and records a user.suspended event.",
          unsuspendDesc:
            "Reactivation restores active account status and records a user.unsuspended event.",
          statusLabel: "Status:",
          reasonLabel: "Technical Justification (Mandatory) *",
          reasonPlaceholder:
            "Describe the detailed reason for suspension (minimum 5 characters)...",
          reasonHint: "Minimum 5 characters after trimming spaces. Mandatory for audit compliance.",
          reasonTooShortError:
            "Technical justification must contain at least 5 characters.",
          selfSuspendWarning:
            "Administrators cannot suspend their own account.",
          lastAdminWarning:
            "Operation blocked: you cannot suspend the last active administrator.",
          confirmStepTitle: "Confirm operation",
          confirmSuspendDesc: (username: string) =>
            `Confirm the suspension of @${username}?`,
          confirmUnsuspendDesc: (username: string) =>
            `Confirm the reactivation of @${username}?`,
          confirmActionBtn: "Confirm and apply",
          backBtn: "Back",
          processingBtn: "Processing...",
          suspendSuccessMessage: "User suspended successfully.",
          unsuspendSuccessMessage: "User reactivated successfully.",
          cancelBtn: "Cancel",
          confirmBtn: "Review action",
          closeAriaLabel: "Close modal",
        },
        auditHistory: {
          title: "Access & Status Change History",
          subtitle:
            "Append-only log of role changes, suspensions, and reactivations.",
          appendOnlyBadge: "APPEND-ONLY",
          loading: "Loading history...",
          empty: "No administrative changes recorded yet.",
          actorLabel: "Actor",
          targetLabel: "Affected user",
          reasonLabel: "Justification",
          roleTransition: (from: string, to: string) => `${from} → ${to}`,
          actions: {
            "user.role_changed": "Role changed",
            "user.role_updated": "Role changed",
            "user.suspended": "User suspended",
            "user.unsuspended": "User reactivated",
          },
        },
        errorMessages: {
          forbidden: "Access denied (42501): only active administrators can perform this action.",
          selfDemote: "Operation blocked (42501): administrators cannot demote their own account.",
          selfSuspend: "Operation blocked (42501): administrators cannot suspend their own account.",
          lastAdmin: "Operation blocked (42501): cannot demote or suspend the last active administrator.",
          reasonTooShort: "Validation failed (22023): justification must be at least 5 characters.",
          alreadySuspended: "Invalid operation (22023): user is already suspended.",
          alreadyActive: "Invalid operation (22023): user is already active.",
          notFound: "Record not found (P0002).",
          generic: "Could not complete the operation.",
        },
      },
      auditPage: {
        eyebrow: "SECURITY & COMPLIANCE",
        title: "Security Audit Center",
        subtitle:
          "Read-only (append-only) log of administrative interventions, role changes, moderation, suspensions, and access denials.",
        refreshButton: "Refresh logs",
        refreshingButton: "Refreshing...",
        summary: {
          totalEvents: "Total events",
          criticalEvents: "Critical events",
          adminChanges: "Admin changes",
          accessDenied: "Access denied",
          recentEvents: "Last 24h",
        },
        searchPlaceholder: "Search by operator, entity ID, action, or metadata...",
        filterOperator: "Operator",
        operatorPlaceholder: "Filter by @operator...",
        filterAction: "Filter by Action",
        filterEntityType: "Entity Type",
        filterPeriod: "Period",
        filterSeverity: "Classification",
        allActions: "All Actions",
        allEntityTypes: "All Entities",
        allPeriods: "Full History",
        allSeverities: "All Classifications",
        periodToday: "Today (24h)",
        period7Days: "Last 7 Days",
        period30Days: "Last 30 Days",
        period90Days: "Last 90 Days",
        periodCustom: "Custom range",
        startDateLabel: "Start date",
        endDateLabel: "End date",
        sortLabel: "Sort",
        sortNewest: "Newest first",
        sortOldest: "Oldest first",
        clearFiltersBtn: "Clear filters",
        pageSizeLabel: "Per page",
        resultsCount: (shown: number, total: number) =>
          `Showing ${shown} of ${total} event${total === 1 ? "" : "s"}`,
        pageIndicator: (page: number, totalPages: number) =>
          `Page ${page} of ${totalPages}`,
        prevPageBtn: "Previous",
        nextPageBtn: "Next",
        idCol: "ID",
        timestampCol: "Timestamp",
        actorCol: "Operator",
        actionCol: "Audited Action",
        entityCol: "Target Entity",
        severityCol: "Classification",
        metadataCol: "Record / Metadata",
        actionsCol: "Actions",
        viewDetailsBtn: "Details",
        exportCsvBtn: "Export CSV",
        exportSuccess: (count: number) =>
          `CSV exported safely (${count} record${count === 1 ? "" : "s"}).`,
        exportEmptyError: "There are no filtered records to export.",
        exportError: "Could not generate the CSV file.",
        loadingMessage: "Loading audit trail...",
        errorTitle: "Failed to query audit logs",
        errorMessage: "Unable to load records right now. Please try again.",
        retryButton: "Try again",
        emptyTitle: "No events found",
        emptyState: "No audit logs found matching the selected filters.",
        incompleteBadge: "Partial Information",
        immutableNotice:
          "Audit logs are strictly append-only. Immutability is enforced by PostgreSQL triggers and RLS policies.",
        severityLabels: {
          info: "Informational",
          warning: "Warning",
          critical: "Critical",
          access_denied: "Access denied",
        },
        detailsModal: {
          eyebrow: "SECURITY AUDIT",
          title: "Audit Event Details",
          eventInfoTitle: "Event Parameters",
          rawMetadataTitle: "Structured Metadata (Sanitized JSON)",
          closeBtn: "Close",
          closeAriaLabel: "Close audit modal",
          actorLabel: "Responsible Operator:",
          actionLabel: "Executed Action:",
          entityTypeLabel: "Entity Type:",
          entityIdLabel: "Entity Identifier:",
          timestampLabel: "UTC / Local Time:",
          severityLabel: "Classification:",
          descriptionLabel: "Description:",
          reasonLabel: "Justification:",
          previousValueLabel: "Previous Value:",
          nextValueLabel: "New Value:",
          targetUserLabel: "Affected User:",
          integrityComplete: "Complete",
          sanitizedBadge: "Sanitization active",
          loadingMessage: "Loading event details...",
          notFoundMessage: "Event not found.",
          ipNotice: "Sensitive data (passwords, secret keys, emails, and tokens) is automatically masked before display.",
        },
        actionLabels: {
          "user.role_changed": "RBAC Role Change",
          "user.role_updated": "RBAC Role Change",
          "user.suspended": "Account Suspension",
          "user.unsuspended": "Account Reactivation",
          "resource.approved": "Resource Approval",
          "resource.rejected": "Resource Rejection",
          "resource.archived": "Resource Archival",
          "topic.pin": "Pin Topic",
          "topic.unpin": "Unpin Topic",
          "topic.lock": "Lock Topic",
          "topic.unlock": "Unlock Topic",
          "topic.hide": "Hide Topic",
          "topic.unhide": "Restore Topic",
          "topic.delete": "Delete Topic",
          "post.hide": "Hide Reply",
          "post.unhide": "Restore Reply",
          "post.delete": "Delete Reply",
          "report.reviewing": "Report Triage",
          "report.resolved": "Report Resolution",
          "report.dismissed": "Report Dismissal",
          "research.approved": "Research Approval",
          "research.rejected": "Research Rejection",
          "research.revision_requested": "Research Revision Requested",
          "auth.access_denied": "Access Denied Blocked",
          "system.config_updated": "Critical Config Updated",
          "maintenance.cleanup": "Automated Maintenance Routine",
        },
        entityTypeLabels: {
          profile: "User Profile",
          resource: "Catalog Resource",
          topic: "Forum Topic",
          post: "Forum Reply",
          report: "Incident / Report",
          research: "Cybercrime Research",
          system: "System Parameter",
        },
      },
      moderationPage: {
        eyebrow: "TRIAGE & SECURITY",
        title: "Content Moderation Center",
        subtitle:
          "Unified queue for technical validation, justified approval and rejection of resources, forum topics, replies, and community research submissions.",
        queueTab: "Unified Queue",
        reportsTab: "Reports",
        searchPlaceholder: "Search by title, author, category, reason, or ID...",
        filterType: "Content Type",
        filterStatus: "Status",
        filterPriority: "Priority",
        filterCategory: "Category",
        filterAuthor: "Author",
        authorPlaceholder: "Filter by @author...",
        filterReports: "Reports",
        filterPeriod: "Period",
        clearFiltersBtn: "Clear filters",
        allTypes: "All Types",
        allStatuses: "All Statuses",
        allPriorities: "All Priorities",
        allCategories: "All Categories",
        allReports: "With or without reports",
        withReportsOnly: "Reported only",
        withoutReportsOnly: "No reports",
        allPeriods: "All Time",
        period24h: "Past 24 Hours",
        period7d: "Past 7 Days",
        period30d: "Past 30 Days",
        typeCol: "Type",
        titleCol: "Content / Title",
        authorCol: "Author",
        categoryCol: "Category",
        submittedCol: "Submitted",
        updatedCol: "Updated",
        priorityCol: "Priority",
        reportsCol: "Reports",
        statusCol: "Status",
        actionsCol: "Actions",
        reviewBtn: "Review",
        approveBtn: "Approve",
        rejectBtn: "Reject",
        hideBtn: "Hide",
        restoreBtn: "Restore",
        escalateBtn: "Escalate",
        requestRevisionBtn: "Request Revision",
        resubmitBtn: "Resubmit",
        emptyState: "No content found in the queue matching the selected filters.",
        noQueueItems: "The moderation queue is currently empty.",
        loadError: "Unable to load the moderation queue.",
        retryBtn: "Retry",
        conflictError: "State conflict (409): the selected action is incompatible with the item's current status.",
        unauthorizedError: "Access denied (42501): only active moderators or administrators can moderate.",
        incompleteBadge: "Incomplete Information",
        counterPending: "Pending Items",
        counterTotal: "Total in Queue",
        counterReported: "With Reports",
        counterEscalated: "Escalated",
        reportsSectionTitle: "Content-Linked Reports",
        reportsEmpty: "No reports found for the selected filters.",
        reporterProtected: "Protected identity (privacy)",
        analyzeReportBtn: "Review Report",
        statusLabels: {
          pending: "Pending",
          approved: "Approved",
          rejected: "Rejected",
          revision_requested: "Revision Requested",
          escalated: "Escalated",
          archived: "Archived",
          published: "Published",
          hidden: "Hidden",
          deleted: "Deleted",
        },
        priorityLabels: {
          low: "Low",
          medium: "Medium",
          high: "High",
          critical: "Critical",
        },
        typeLabels: {
          resource: "Catalog Resource",
          topic: "Forum Topic",
          post: "Forum Reply",
          research: "Cybercrime Research",
        },
        actionLabels: {
          approve: "Approval",
          reject: "Rejection",
          hide: "Hide",
          unhide: "Unhide",
          restore: "Restore",
          escalate: "Escalation",
          request_revision: "Revision Request",
          archive: "Archive",
          delete: "Removal",
        },
        detailModal: {
          title: "Content Technical Review",
          authorLabel: "Community Author:",
          categoryLabel: "Category / Domain:",
          submittedAtLabel: "Submission Date:",
          updatedAtLabel: "Last Updated:",
          priorityLabel: "Priority:",
          reportCountLabel: "Reports:",
          flagReasonLabel: "Flag Reason:",
          urlInspectionTitle: "Defensive External Link Inspection",
          urlNonConclusiveNotice:
            "Static defensive analysis — no external link is automatically fetched. Heuristic indicators are not proof of malicious activity.",
          contentBodyTitle: "Submitted Content Body",
          historyTitle: "Decision History",
          noHistory: "No decisions recorded for this item yet.",
          closeBtn: "Close",
        },
        decisionModal: {
          approveTitle: "Approve & Publish Content",
          rejectTitle: "Reject Content with Justification",
          hideTitle: "Hide Content from Public View",
          restoreTitle: "Restore Content",
          escalateTitle: "Escalate for Additional Review",
          requestRevisionTitle: "Request Author Revision",
          approveDesc:
            "Approval makes this content visible on the platform. This action is recorded in the audit history.",
          rejectDesc:
            "Rejection requires a mandatory technical justification (minimum 5 characters).",
          hideDesc:
            "Hiding removes the item from public listings while preserving the audit trail (minimum 5 characters).",
          restoreDesc:
            "Restores the item for review or visibility compatible with its content type.",
          escalateDesc:
            "Forwards the item for deeper review by another moderator or administrator (minimum 5 characters).",
          requestRevisionDesc:
            "Requests adjustments from the author before publication (minimum 5 characters).",
          reasonLabel: "Technical Justification (Mandatory) *",
          reasonOptionalLabel: "Technical Note (Optional)",
          reasonPlaceholder:
            "Provide detailed feedback on this moderation decision (minimum 5 characters for restrictive actions)...",
          reasonHint: "Minimum 5 characters. Archived for traceability.",
          reasonMinError: "Justification must contain at least 5 characters.",
          generalError: "Error recording moderation decision. Please check permissions and item status.",
          confirmApproveBtn: "Confirm Approval",
          confirmRejectBtn: "Confirm Rejection",
          confirmHideBtn: "Confirm Hide",
          confirmRestoreBtn: "Confirm Restore",
          confirmEscalateBtn: "Confirm Escalation",
          confirmRevisionBtn: "Confirm Request",
          cancelBtn: "Cancel",
        },
      },
    },
    resourceTypes: {
      tool: "Tool",
      repository: "Repository",
      script: "Script",
      framework: "Framework",
      documentation: "Documentation",
      lab: "Hands-on Lab",
      ctf_platform: "CTF Platform",
      course: "Course",
      article: "Technical Article",
    },
    difficulties: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
    languages: {
      en: "English (EN)",
      "pt-BR": "Portuguese (PT-BR)",
      multilingual: "Multilingual",
      other: "Other",
    },
  },
};

export function resolveLocale(input?: string | null): SupportedLocale {
  if (input && (SUPPORTED_LOCALES as readonly string[]).includes(input)) {
    return input as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export function getDictionary(locale?: string | null): Dictionary {
  return dictionaries[resolveLocale(locale)];
}
