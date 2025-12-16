import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // Main menu
          "home": "Home",
          "platform": "Platform",
          "genre": "Genre",
          "about": "About",

          // Platform submenu
          "summary": "Summary",
          "video": "Video",
          "audio": "Audio",
          "podcast": "Podcast",

          // Genre submenu
          "playdoier": "Playdoier",
          "fundraising": "Fundraising",
          "technical": "Technical",

          // About submenu
          "structure": "Structure",
          "goals": "Goals",
          "members": "Members",
          "contact": "Contact",

          // User section
          "search": "Search",
          "profile": "Profile",
          "settings": "Settings",
          "notifications": "Notifications",
          "logout": "Logout",

          // Auth
          "login": "Login",
          "signup": "Sign Up",
          "welcome_back": "Welcome back",
          "login_to_account": "Login to your account",
          "create_account": "Create your account",
          "join_community": "Join our community now",
          "email": "Email address",
          "password": "Password",
          "remember_me": "Remember me",
          "forgot_password": "Forgot password?",
          "no_account": "Don't have an account?",
          "have_account": "Already have an account?",
          "first_name": "First name",
          "last_name": "Last name",
          "to_connect": "To connect",
          "confirm_password": "Confirm password",
          "accept_terms": "I accept the terms and conditions",
          "login_with": "Or login with",
          "signup_with": "Or sign up with",
          "password_strength": "Password strength",
          "continue_with_google": "Continue with Google",
          "connect": "Connect",
          "register": "Register",

          // Auth errors
          "required": "This field is required",
          "invalidEmail": "Invalid email",
          "passwordMinLength": "Minimum 8 characters",
          "passwordMismatch": "Passwords don't match",
          "an_error_has_occurred": "An error has occurred",
          "incorrect_credentials": "Incorrect credentials",
          "failed_to_register": "Failed to register",
          "generic": "An error occurred",
          "invalid_credentials": "Invalid credentials",
          "registration_failed": "Registration failed",
          "invalid_session": "Invalid session",
          "logout_failed": "Logout failed",
          "email_required": "Email is required",
          "password_required": "Password is required",
          "email_invalid": "Invalid email",
          "password_too_short": "Password must be at least 8 characters",
          "login_success": "Login successful!",
          "registration_success": "Registration successful!",
          "logout_success": "Logout successful",
          "username_required": "Username is required",
          "username": "Username",
          
          // Auth messages
          "loading": "Loading...",

          // Language
          "language": "Language",
          
          // User Management
          "user_management": "User Management",
          "manage_accounts_access": "Manage accounts and access",
          "global_search": "Global search...",
          "my_profile": "My Profile",
          "edit_profile": "Edit Profile",
          "user_list": "User List",
          "permissions": "Permissions",
          "roles": "Roles",
          "activity": "Activity",
          "administrator": "Administrator",
          "active": "Active",
          "message": "Message",
          "follow": "Follow",
          "projects": "Projects",
          "tasks": "Tasks",
          "teams": "Teams",
          "personal_information": "Personal Information",
          "full_name": "Full name",
          "phone": "Phone",
          "birthdate": "Birthdate",
          "address": "Address",
          "recent_activity": "Recent Activity",
          "successful_login": "Successful login",
          "today_at": "Today at",
          "from_paris": "from Paris, France",
          "password_changed": "Password changed",
          "yesterday_at": "Yesterday at",
          "skills": "Skills",
          "add_skill": "Add a skill",
          "security_settings": "Security Settings",
          "strong": "Strong",
          "edit": "Edit",
          "two_factor_auth": "Two-factor authentication",
          "role": "Role",
          "about": "About",
          "admin_description": "System administrator with 5 years of experience in user and permissions management.",
          "search_user": "Search for a user...",
          "all_roles": "All roles",
          "new_user": "New user",
          "user": "User",
          "status": "Status",
          "last_activity": "Last activity",
          "actions": "Actions",
          "showing": "Showing",
          "to": "to",
          "of": "of",
          "users": "users",
          "previous": "Previous",
          "next": "Next",
          "permissions_management": "Permissions Management",
          "configure_role_access": "Configure access for each role",
          "save": "Save",
          "table": "Table",
          "read": "Read",
          "create": "Create",
          "update": "Update",
          "delete": "Delete",
          "all": "All",
          "special_permissions": "Special Permissions",
          "export_data": "Export data",
          "export_data_desc": "Allows exporting system data",
          "import_data": "Import data",
          "import_data_desc": "Allows importing data into the system",
          "manage_users": "Manage users",
          "manage_users_desc": "Allows creating/modifying/deleting users",
          "manage_roles": "Manage roles",
          "manage_roles_desc": "Allows creating/modifying/deleting roles",
          "system_settings": "System settings",
          "system_settings_desc": "Allows modifying global settings",
          "backup_restore": "Backup/Restore",
          "backup_restore_desc": "Allows system backup and restore",
          "roles_management": "Roles Management",
          "create_manage_roles": "Create and manage user roles",
          "new_role": "New role",
          "role_name": "Role name",
          "description": "Description",
          "creation_date": "Creation date",
          "manage_content": "Manage content",
          "create_new_role": "Create a new role",
          "activity_log": "Activity Log",
          "user_actions_history": "History of user actions",
          "filter": "Filter...",
          "export": "Export",
          "user_updated_permissions": "Sophie Martin updated permissions for role 'Editor'",
          "permission": "Permission",
          "enabled": "Enabled",
          "editor": "Editor",
          "guest": "Guest",
          "edit_profil": "Edit Profile",
          "save_changes": "Save Changes",
          "uploading": "Uploading...",
          "upload_success": "Photo updated successfully!",
          "upload_error": "Error uploading photo",
          "invalid_format": "Unsupported format (JPEG, PNG or GIF only)",
          "file_too_large": "Image is too large (max 2MB)",
          "connection_error": "Connection error to the server",
          "current_password": "Current password",
          "enter_current_password": "Enter your current password",
          "new_password": "New password",
          "enter_new_password": "Enter your new password",
          "confirm_new_password": "Confirm your new password",
          "password_requirements": "Must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a symbol",
          "two_factor_auth_description": "Protect your account with an extra layer of security",
          "current_password_required": "Current password is required",
          "new_password_required": "New password is required",
          "confirm_password_required": "Password confirmation is required",
          "passwords_do_not_match": "Passwords do not match",
          "password_min_length_8": "Password must be at least 8 characters long",
          "new_password_must_differ": "New password must be different from the current one",
          "password_updated_successfully": "Password updated successfully",
          "unauthorized_action": "Unauthorized action",
          "error_occurred": "An error occurred",
          "title": "Profile information",
          "loading": "Loading profile...",
          "fetch_error": "Failed to load profile",
          "update_error": "Failed to update profile",
          "validation_error": "Validation error",
          "update_success": "Profile updated successfully!",
          "saving": "Saving...",
          "username_placeholder": "Enter your username",
          "unique": "unique",
          "first_name_placeholder": "Enter your first name",
          "last_name_placeholder": "Enter your last name",
          "email_placeholder": "Enter your email",
          "phone_placeholder": "Enter your phone number",
          "address_placeholder": "Enter your full address",
          "no_roles": "No roles assigned",
          "account_status": "Account status",
          "inactive": "Inactive account",
          "email_verification": "Email verification",
          "verified": "Email verified",
          "not_verified": "Email not verified",
          "email_not_verified": "Your email address is not verified",
          "resend_email": "Resend email",
          
          // User management
          "confirm_deletion": "Confirm Deletion",
          "delete_user_confirmation": "Are you sure you want to delete the user {{name}}?",
          "delete_warning_irreversible": "This action is irreversible. All data associated with this user will be permanently deleted.",
          "deactivate_alternative_message": "You can also deactivate this user instead of deleting them permanently.",
          "deleting": "Deleting",
          "deactivating": "Deactivating",
          "activating": "Activating",
          "delete": "Delete",
          "deactivate": "Deactivate",
          "activate": "Activate",
          "user_deleted_successfully": "User deleted successfully",
          "user_deactivated_successfully": "User deactivated successfully",
          "user_activated_successfully": "User activated successfully",
          "error_deleting_user": "Error deleting user",
          "error_deactivating_user": "Error deactivating user",
          "error_activating_user": "Error activating user",
          "error_updating_role": "Error updating role",
          "edit_role": "Edit Role",
          "edit_user_role": "Edit User Role",
          "change_role_for_user": "Change role for {{name}}",
          "current_role": "Current Role",
          "select_role": "Select a role",
          "loading_roles": "Loading roles...",
          "updating": "Updating",
          "update_role": "Update Role",
          "role_updated_successfully": "Role updated successfully",
          "deactivate_user": "Deactivate User",
          "activate_user": "Activate User",
          "deactivate_user_confirmation": "Do you want to deactivate the user {{name}}?",
          "activate_user_confirmation": "Do you want to reactivate the user {{name}}?",
          "current_status": "Current Status",
          "deactivate_user_warning": "The user will no longer be able to log in to the application.",
          "activate_user_info": "The user will be able to log in to the application again.",
          "assign_permissions": "Assign Permissions",
          "edit_role_permissions": "Edit Role Permissions",
          "choose_role": "Choose a role...",
          "select_permissions": "Select Permissions",
          "search_permissions": "Search permissions...",
          "no_permissions_found": "No permissions found",
          "permission_assigned_success": "Permissions assigned successfully",
          "create_role": "Create Role",
          "enter_role_name": "Enter role name",
          "enter_description": "Enter description",
          "active_role": "Active Role",
          "name_required": "Role name is required",
          "name_too_long": "Role name must be 50 characters or less",
          "characters": "characters",
          "create": "Create",
          "update": "Update",
          "close": "Close",
          "enter_description_optional": "Enter description (optional)",
          "description_too_long": "Description must not exceed {{max}} characters",
          "active_role_hint": "If disabled, this role cannot be assigned.",
          "saving": "Saving",
          "active": "active",
          "inactive": "inactive",

           "create_manage_roles": "Create and manage the roles of your application",
              "new_role": "New Role",
              "role_name": "Role Name",
              "description": "Description",
              "users": "Users",
              "creation_date": "Creation Date",
              "status": "Status",
              "actions": "Actions",
              "edit": "Edit",
              "delete": "Delete",
              "loading": "Loading...",
              "no_roles_found": "No roles found",
              "search_by_name": "Search by name...",
              "confirm_delete": "Confirm Deletion",
              "delete_role_confirmation": "Are you sure you want to delete the role \"{{name}}\"?",
              "cancel": "Cancel",
              "confirm": "Confirm",
              "delete_error": "Error during deletion",
              "active": "Active",
              "inactive": "Inactive",

              "assign_role_to_user": "Assign a role to a user",
              "select_user": "Select a user",
              "select_role": "Select a role",
              "choose_user": "Choose a user...",
              "choose_role": "Choose a role...",
              "user_already_has_roles": "This user already has roles.",
              "user_has_no_role_yet": "This user has no role yet.",
              "assign_role": "Assign role",
              "role_assigned_successfully": "Role assigned successfully.",
              "failed_to_assign_role": "Failed to assign role.",
              "please_select_user": "Please select a user.",
              "please_select_role": "Please select a role.",
              "no_description": "No description",
              "failed_add_role": "Failed to add role.",
              "failed_remove_role": "Failed to remove role.",

                "loading_roles": "Loading roles...",
              "search_users_or_roles": "Search user or role...",
              "confirm_delete": "Confirm deletion",
              "delete_confirmation": "Delete role \"{{role}}\" for user \"{{user}}\"?",
              "cancel": "Cancel",
              "confirm": "Confirm",
              "success_delete": "Role deleted successfully.",
              "error_delete": "Failed to delete role.",
              "error_load": "Failed to load roles.",
              "no_roles_found": "No roles found",
              "page_info": "Page {{current}} of {{total}} ({{count}} result(s))",
              "roles_management": "User Role Management",
              "user": "User",
              "role": "Role",
              "description": "Description",
              "assigned_on": "Assigned on",
              "assigned_by": "Assigned by",
              "actions": "Actions",
              "me_indicator": "← ME",
              "manage_roles_advanced": "Manage roles",
              "advanced_role_management": "Advanced Role Management",

              "edit_user": "Edit user",
              "user_settings": "User settings",
              "delete_user": "Delete user",
              "delete_role": "Delete role",
              "permissions": "Permissions",
              "manage_permissions": "Manage permissions",
              "manage_role_permissions": "Manage role permissions",
              "add_permission": "Add permission",
              "existing_permissions": "Existing permissions",
              "role": "Role",
              "permission": "Permission",
              "granted_by": "Granted by",
              "granted_at": "Granted at",
              "grant_permission": "Grant permission",
              "fill_required_fields": "Please fill in the required fields",
              "permission_granted_success": "Permission granted successfully",
              "failed_to_grant_permission": "Failed to grant permission",
              "confirm_delete_permission": "Confirm deletion of this permission?",
              "permission_removed": "Permission removed",
              "delete_failed": "Deletion failed",
              "select_role": "Select a role",
              "select_permission": "Select a permission",
              "no_permissions_granted": "No permissions granted",

              "permissions_management": "Permissions Management",
              "manage_permissions_description": "Create and manage system permissions",
              "search_permissions_placeholder": "Search by name, resource, or action...",
              "permission_details": "Permission Details",
              "no_description": "No description",

               "Users": "Users",
  "Revenue": "Revenue",
  "Growth": "Growth",
  "noData": "Not enough data for this chart",

  // Barre latérale + Visualiseur
// Sidebar + Visualizer
"Library": "Library",
"Open library": "Open library",
"Close": "Close",
"Search...": "Search...",
"Clear": "Clear",
"Files": "Files",
"Tags": "Tags",
"Similar": "Similar",
"No media found.": "No media found.",
"Tags not provided": "Tags not provided",
"Add tag": "Add tag",
"Untitled": "Untitled",
"Preview": "Preview",
"Media": "Media",
"Metadata": "Metadata",
"Versions": "Versions",
"Statistics": "Statistics",
"SEO": "SEO",
"No version available": "No version available",
"Hide library": "Hide library",
"Show library": "Show library",
"Fullscreen": "Fullscreen",
"Download": "Download",
"Share": "Share",
"Oops, something went wrong.": "Oops, something went wrong.",
"Unknown error.": "Unknown error.",
"infinite": "Infinite",
"paginated": "Paginated",

  "visualiseur": {
    "title": "Viewer",
    "back": "Back",
    "refresh": "Refresh", 
    "fullscreen": "Fullscreen",
    "download": "Download",
    "share": "Share",
    "close": "Close",
    "loading": "Loading...",
    "error": "Error",
    "articleNotFound": "Article not found",
    "protectedContent": "Protected content",
    "passwordRequired": "Password required",
    "enterPassword": "Enter password",
    "unlock": "Unlock",
    "cancel": "Cancel",
    "incorrectPassword": "Incorrect password",
    "privateAccess": "Restricted access",
    "noPermission": "You don't have permission to view this article",
    "askAdmin": "Ask an administrator for authorization",
    "login": "Login",
    "backButton": "Back",
    "tips": "Tip",
    "shortcuts": "Shortcuts: P, Enter or Ctrl+K",
    "missingId": "Missing identifier/slug in URL.",
    "restrictedAccess": "Restricted access - permission required.",
    "authRequired": "Restricted access - authentication required.",
    "loadingError": "Error loading",
    "unlockError": "Error unlocking.",
    "untitled": "Untitled",
    "selectFile": "Select a file",
    "attachment": "Attachment",
    "debug": "Debug",
    "change": "change",
    "other": "other",
    "unknownAuthor": "Unknown author",
    
    "tabs": {
      "preview": "Preview",
      "media": "Media", 
      "metadata": "Metadata",
      "versions": "Versions",
      "statistics": "Statistics",
      "seo": "SEO"
    },
    
    "sidebar": {
      "hide": "Hide library",
      "show": "Show library",
      "mediaCount": "{{count}} media",
      "mediaCount_plural": "{{count}} media",
      "tags": "Tags",
      "similar": "Similar articles",
      "manageTags": "Manage tags"
    },
    
    "media": {
      "noMedia": "No media linked to this article",
      "search": "Search by title, #id, MIME type, tag…",
      "filters": "Filters",
      "reset": "Reset all",
      "type": "Type",
      "allTypes": "All",
      "typeImage": "Image",
      "typeVideo": "Video",
      "typeOther": "Other",
      "featured": "Featured",
      "allFeatured": "All",
      "featuredYes": "Featured",
      "featuredNo": "Not featured",
      "sort": "Sort",
      "sortDate": "Date",
      "sortTitle": "Title", 
      "sortSize": "Size",
      "direction": "Direction",
      "desc": "Desc",
      "asc": "Asc",
      "grid": "Grid view",
      "list": "List view",
      "preview": "Preview",
      "open": "Open",
      "noResults": "No media matches the filters",
      "showFilters": "Show filters",
      "hideFilters": "Hide filters"
    },
    
    "metadata": {
      "title": "Title",
      "filename": "Filename",
      "mediaType": "Media type", 
      "status": "Status",
      "visibility": "Visibility",
      "creationDate": "Creation date",
      "lastModified": "Last modified",
      "publishedDate": "Published on",
      "author": "Author",
      "mainCategory": "Main category",
      "tags": "Keywords (tags)",
      "readingTime": "Reading time (min)",
      "wordCount": "Word count",
      "id": "ID",
      "slug": "Slug"
    },
    
    "preview": {
      "noMedia": "No media",
      "addMedia": "No media is currently available. Please refer to the content below.",
      "articleContent": "Article content",
      "highResolution": "View in high resolution",
      "download": "Download",
      "enlarge": "Enlarge preview",
      "playVideo": "Enlarge video", 
      "enlargeMap": "Enlarge map"
    },
    
    "statistics": {
      "title": "Article statistics",
      "views": "Views",
      "shares": "Shares",
      "comments": "Comments",
      "ratings": "Ratings",
      "averageRating": "Average rating",
      "engagement": "Engagement",
      "engagementSubtitle": "Interactions distribution",
      "popularTags": "Popular tags",
      "tagUsage": "Global tag usage", 
      "history": "History",
      "actions": "Actions performed",
      "quality": "Quality",
      "averageScore": "Average score given",
      "outOf5": "out of 5",
      "rating": "rating",
      "rating_plural": "ratings",
      "noEngagementData": "No engagement data available",
      "noRatingData": "No rating available"
    },
    
    "details": {
      "title": "File details",
      "author": "Author",
      "category": "Category",
      "creationDate": "Creation date",
      "lastModified": "Last modified", 
      "rate": "Rate",
      "editRating": "Edit"
    }
  }
,
 "filters": {
    "search": {
      "ariaLabel": "Article search",
      "placeholder": "Type to search...",
      "tip": "Tip: \"/\" to focus",
      "clear": "Clear search",
      "execute": "Execute search",
      "showHistory": "Show search history",
      "hideHistory": "Hide search history",
      "recentSearches": "Recent searches",
      "clearHistory": "Clear history",
      "suggestions": "Suggestions"
    },
    "searchHints": {
      "example1": "Ex: ai startup after:2024-01-01",
      "example2": "Ex: author:\"Author #12\" tag:mobile",
      "example3": "Ex: category:\"Artificial Intelligence\" rating>4",
      "tip": "Tip: type \"/\" to focus"
    },
    "view": {
      "grid": "Grid view",
      "list": "List view"
    },
    "itemsPerPage": "Items per page",
    "toggleFilters": "Show/Hide filters",
    "filters": "Filters",
    "export": "Export to CSV",
    "categories": "Categories",
    "tags": "Tags",
    "authors": "Authors",
    "options": "Options",
    "dates": "Dates",
    "rating": "Rating",
    "saved": "Saved",
    "quickOptions": "Quick options",
    "savedFilters": "Saved filters",
    "resetAll": "Reset all",
    "apply": "Apply",
    "reset": "Reset",
    "resetSection": "Reset {{section}}",
    "noOptions": "No {{type}} available",
    "types": {
      "categories": "categories",
      "tags": "tags",
      "authors": "authors"
    },
    "featuredOnly": "Featured only",
    "pinnedOnly": "Pinned only",
    "unreadOnly": "Unread only",
    "startDate": "Start date",
    "endDate": "End date",
    "minRating": "Minimum rating",
    "maxRating": "Maximum rating",
    "saveCurrent": "Save current state",
    "noSavedFilters": "No saved filters. Configure your filters then click \"Save current state\".",
    "loadFilter": "Load filter: {{name}}",
    "deleteFilter": "Delete filter: {{name}}",
    "createdOn": "Created on",
    "suggestedNames": {
      "featured": "featured",
      "pinned": "pinned",
      "unread": "unread",
      "period": "period",
      "rating": "rating",
      "custom": "Custom filter"
    },
    "saveModal": {
      "title": "Save filter",
      "description": "Give a descriptive name to this filter configuration.",
      "filterName": "Filter name",
      "placeholder": "Ex: Recent AI articles"
    },
    "toasts": {
      "filtersApplied": "Filters applied",
      "filtersReset": "Filters reset",
      "filterSaved": "Filter \"{{name}}\" saved",
      "saveError": "Error saving filter",
      "filterLoaded": "Filter \"{{name}}\" loaded",
      "filterDeleted": "Filter deleted"
    }
  },
  "common": {
    "close": "Close",
    "cancel": "Cancel",
    "save": "Save"
  }
,
 "gridcard": {
    "unknownAuthor": "Unknown author",
    "author": "Author",
    "date": {
      "unknown": "—",
      "published": "Published on",
      "updated": "Updated"
    },
    "visibility": {
      "public": "Public",
      "private": "Private",
      "passwordProtected": "Password protected",
      "unknown": "—",
      "label": "Visibility"
    },
    "actions": {
      "read": "Read",
      "enterPassword": "Enter password",
      "addFavorite": "Add to favorites",
      "removeFavorite": "Remove from favorites",
      "addLike": "Add to likes",
      "removeLike": "Remove from likes"
    },
    "badges": {
      "favorite": "Favorite",
      "liked": "Liked",
      "read": "Read"
    },
    "stats": {
      "views": "Views",
      "comments": "Comments",
      "shares": "Shares",
      "reviews": "reviews"
    },
    "passwordModal": {
      "title": "Access to \"{{title}}\""
    }}
  ,
  "listtable": {
  "headers": {
    "image": "Image",
    "title": "Title", 
    "author": "Author",
    "category": "Category",
    "published": "Published",
    "views": "Views",
    "rating": "Rating",
    "status": "Status",
    "actions": "Actions"
  },
  "categories": {
    "ai": "Artificial Intelligence",
    "startup": "Startup",
    "webdev": "Web Development", 
    "business": "Business",
    "mobile": "Mobile",
    "article": "Article"
  },
  "status": {
    "published": "Published",
    "draft": "Draft",
    "unread": "Unread"
  },
  "visibility": {
    "public": "Public",
    "private": "Private",
    "passwordProtected": "Password Protected",
    "unknown": "Unknown"
  },
  "badges": {
    "featured": "Featured",
    "sticky": "Pinned"
  },
  "stats": {
    "views": "views",
    "reviews": "reviews"
  },
  "date": {
    "created": "Created on"
  },
  "actions": {
    "read": "Read article",
    "share": "Share",
    "addFavorite": "Add to favorites", 
    "removeFavorite": "Remove from favorites"
  },
  "empty": {
    "title": "No articles found",
    "subtitle": "Try adjusting your search criteria"
  }
},

   "pagination": {
    "navigation": "Pagination navigation",

    "showing": "Showing <strong>{{start}}</strong>–<strong>{{end}}</strong> of <strong>{{total}}</strong>",

    "itemsPerPage": "Items/page",

    "firstPage": "First page",
    "previousPage": "Previous page",
    "nextPage": "Next page",
    "lastPage": "Last page",

    "pageNumber": "Page {{number}}",
    "pages": "Pages",

    "jumpToPage": "Go to page",
    "jumpToPageAria": "Enter page number",
    "jumpPlaceholder": "Page #"
  }
,

  "smartimage": {
    "loading": "Loading image...",
    "unavailable": "Image unavailable",
    "unavailableText": "Image unavailable",
    "icon": "Image frame"
  }
,

  "passwordModal": {
    "defaultTitle": "Password required",
    "description": "This content is protected. Enter the password to continue.",
    "close": "Close",
    "passwordLabel": "Password",
    "passwordPlaceholder": "••••••••",
    "rememberSession": "Remember during session",
    "cancel": "Cancel",
    "verifying": "Verifying...",
    "continue": "Continue",
    "validation": {
      "required": "Please enter a password."
    },
    "errors": {
      "generic": "An error occurred during verification."
    }
  }
,

  "auth": {
    "hidePassword": "Hide password",
    "showPassword": "Show password",
    "capsLock": "Caps Lock is on",
    "useSuggestion": "Use suggestion",
    "resetPosition": "Reset to default position",
    "passwordStrength": {
      "start": "Start typing your password",
      "veryWeak": "Very weak",
      "weak": "Weak",
      "good": "Good",
      "strong": "Strong"
    },
    "passwordHints": {
      "minLength": "At least 8 characters",
      "mixedCase": "Uppercase & lowercase letters",
      "number": "At least one number",
      "specialChar": "At least one special character (!@#)"
    },
    "unique": {
      "emailAvailable": "Email available",
      "usernameAvailable": "Username available",
      "emailTaken": "Email already taken",
      "usernameTaken": "Username already taken",
      "checking": "Checking...",
      "checkUnavailable": "Check unavailable"
    },
    "media": {
      "login": {
        "title": "Login",
        "subtitle": "Access your space securely"
      },
      "register": {
        "title": "Registration",
        "subtitle": "Join the community and get started"
      },
      "fallback": {
        "title": "Printing consumables sales",
        "dtf": "DTF — Powders & Films",
        "eco": "Eco-solvent — DX5/DX7",
        "sub": "Sublimation — Textile & transfer",
        "createAccount": "Create an account",
        "nameEmail": "Name, first name, email",
        "uniqueUsername": "Unique username",
        "strongPassword": "Strong password"
      }
    }
  }
,

layout: {
  brand: "Media Manager",
  subtitle: "Back Office Admin",

  titles: {
    dashboard: "Dashboard",
    settings: "Settings",
    platform: "Platform",
    articlesBo: "Articles management",
    articleNew: "New article",
    trashed: "Trash",
    userManagement: "Users & Access",
    societesBo: "Company management",
    bureauxBo: "Office management",
      "orgNodesBo": "Organizational chart"
  },

  sections: {
    media: "Contents & Media",
    settings: "System & Settings",
    users: "Users & Access"
  },

  menu: {
    // Dashboard
    dashboard: "Dashboard",
       "orgNodesBo": "Organizational chart",
    // Content / articles
    platform: "Platform",
    articlesBo: "Articles (Back office)",
    articleNew: "New article",
    trashed: "Trash",
    categoriesTags: "Categories & Tags",

    // Users & roles
    myProfile: "My profile",
    editProfile: "Edit profile",
    user_list: "User list",
    user_roles: "User roles",
    roles: "Roles",
    permissions: "Permissions",
    activity_all: "All activity",

    // Companies / offices
    societesBo: "Companies",
    bureauxBo: "Offices"
  },

  storage: {
    used: "Storage used"
  },

  a11y: {
    openSidebar: "Open sidebar",
    closeSidebar: "Close sidebar",
    sidebar: "Side navigation",
    notifications: "Notifications",
    profile: "Profile"
  }
}


,


 
  "gridcard": {
    "actions": {
      "more": "More actions",
      "read": "Read",
      "enterPassword": "Enter password",
      "addFavorite": "Add to favorites",
      "removeFavorite": "Remove from favorites",
      "disableColor": "Disable color",
      "enableColor": "Enable color"
    },
    "menu": {
      "title": "Actions",
      "openNewTab": "Open in new tab",
      "copyLink": "Copy link",
      "share": "Share"
    },
    "visibility": {
      "public": "Public",
      "private": "Private",
      "passwordProtected": "Password protected",
      "unknown": "Unknown",
      "label": "Visibility"
    },
    "badges": {
      "favorite": "Favorite",
      "read": "Read"
    },
    "date": {
      "published": "Published",
      "updated": "Updated",
      "unknown": "Unknown date"
    },
    "stats": {
      "views": "Views",
      "comments": "Comments",
      "shares": "Shares",
      "reviews": "Reviews"
    },
    "unknownAuthor": "Unknown author",
    "author": "Author"
  }
,
"listtable": {
  "headers": {
    "image": "Image",
    "title": "Title", 
    "author": "Author",
    "category": "Category",
    "published": "Published",
    "views": "Views",
    "rating": "Rating",
    "status": "Status",
    "actions": "Actions"
  },
  "categories": {
    "ai": "Artificial Intelligence",
    "startup": "Startup",
    "webdev": "Web Development", 
    "business": "Business",
    "mobile": "Mobile",
    "article": "Article"
  },
  "status": {
    "published": "Published",
    "draft": "Draft",
    "unread": "Unread"
  },
  "visibility": {
    "public": "Public",
    "private": "Private",
    "passwordProtected": "Password Protected",
    "unknown": "Unknown"
  },
  "badges": {
    "featured": "Featured",
    "sticky": "Pinned"
  },
  "stats": {
    "views": "views",
    "reviews": "reviews"
  },
  "date": {
    "created": "Created on"
  },
  "actions": {
    "read": "Read article",
    "share": "Share",
    "addFavorite": "Add to favorites", 
    "removeFavorite": "Remove from favorites"
  },
  "empty": {
    "title": "No articles found",
    "subtitle": "Try adjusting your search criteria"
  },
  // NOUVELLES CLÉS MANQUANTES
  "responsive": {
    "width": "Width"
  },
  "columns": {
    "button": "Columns",
    "auto": "Auto",
    "custom": "Custom",
    "alwaysOn": "Always visible",
    "reset": "Reset to auto"
  }
},
// === Navbar & Notifications (missing keys) ===
"moderation": "Moderation",
"hello": "Hello",
"open": "Open",
"to_moderate": "to moderate",
"activities": "Activities",
"pending": "To moderate",
"pending_item": "Item to moderate",
"no_activity": "No activity for now",
"nothing_to_moderate": "Nothing to moderate",
"see_all": "See all",
"mark_all_read": "Mark all as read",
"see_more": "See more",
"no_more": "End",

// Time-ago helpers
"just_now": "just now",
"x_min_ago": "{{x}} min ago",
"x_h_ago": "{{x}} h ago",

// Aliases / typos used in code
"sumary": "Summary",     // alias if code uses 'sumary'
"playdoier": "Advocacy"  // keep key; better label than 'Playdoier'
,

  "home": "Home",
  "platform": "Platform",
  "genre": "Genre",
  "about": "About",

  "summary": "Summary",
  "video": "Video",
  "audio": "Audio",
  "podcast": "Podcast",

  "search": "Search",
  "profile": "Profile",
  "settings": "Settings",
  "notifications": "Notifications",
  "logout": "Logout",

  "login": "Login",
  "signup": "Sign Up",
  "email": "Email address",
  "password": "Password",

  "user_management": "User Management",
  "roles": "Roles",
  "permissions": "Permissions",

  "language": "Language",
  "loading": "Loading..."
,
// EN
notfound: {
  book: {
    title: "404 — Book not found",
    subtitle: {
      before: "We searched the shelves. The path ",
      after: " doesn't lead to any book."
    }
  },
  default: {
    title: "404 — Page not found",
    subtitle: {
      before: "We looked everywhere. The path ",
      after: " doesn’t seem to exist."
    }
  },
  actions: {
    back: "Go back",
    home: "Home",
    search: "Search a book"
  },
  tips: 'Tip: press <code>B</code> to go back, <code>H</code> for home.'
}
,
// EN
notfound: {
  actions: {
    back: "Go back",
    home: "Home",
    browseArticles: "Browse articles",
    playGame: "Play mini-game",
    closeGame: "Close mini-game"
  },
  game: {
    help: "Use arrow keys (or WASD) to move the magnifying glass and catch the book. +1 point on each catch."
  }
}
,
legal: {
  config: {
    platformName: "Bibliothèque Numérique Mada",
    lastUpdate: "November 14, 2025",
    country: "Madagascar",
    jurisdiction: "Antananarivo",
    contactEmail: "contact@bibliotheque-mada.mg",
    privacyEmail: "privacy@bibliotheque-mada.mg"
  },

  ui: {
    badge: "Legal information",
    headerTitle: "Terms of Use & Privacy Policy",
    headerIntro:
      "By creating an account, you accept our Terms of Use, our Privacy Policy and our Cookies Policy.",
    tabs: {
      terms: "Terms of Use",
      privacy: "Privacy Policy",
      cookies: "Cookies Policy"
    },
    searchButton: "Search",
    searchHint: "Search in: Terms of Use, Privacy Policy and Cookies Policy.",
    searchPlaceholder: "Search a term (e.g. account, data, cookies…)",
    searchNoResult:
      "No result found for “{{query}}” in the Terms of Use, Privacy Policy or Cookies Policy.",
    searchEmpty:
      "Type a keyword to search in the Terms of Use, Privacy Policy and Cookies Policy.",
    print: "Print",
    copy: "Copy",
    copied: "Copied ✓",
    copyError: "Error",
    footerQuestion: "Questions? Contact us at {{email}}"
  },

  // ===== Terms (CGU) =====
  terms: {
    1: {
      title: "1. Purpose of the terms",
      body:
        "These Terms of Use (the “Terms”) define the rules applicable when you use the platform Bibliothèque Numérique Mada to consult, borrow, purchase or manage books and other documentary resources.\n\nBy creating an account or using the platform, you acknowledge that you have read these Terms and accept them without reservation."
    },
    2: {
      title: "2. Access to the platform",
      body:
        "The platform is in principle accessible 24/7, except for maintenance operations, updates or events beyond our control.\n\nYou are responsible for your equipment (computer, phone, Internet connection) and for any costs related to accessing the service."
    },
    3: {
      title: "3. Account creation and use",
      body:
        "To use certain features (borrowing, purchasing, history, favourites, etc.), you must create a personal account and provide accurate and up-to-date information.\n\nYou are responsible for keeping your password confidential and for any activity carried out from your account. If you suspect fraudulent use, you must inform us as soon as possible."
    },
    4: {
      title: "4. User behaviour",
      body:
        "You agree to use the platform in compliance with the law and the rights of others.\n\nIn particular, the following are prohibited: hateful, insulting, defamatory or discriminatory remarks; illegal, fraudulent or misleading activities; any attempt to hack, intrude or disrupt the service; and any infringement of copyrights or licence terms of the contents made available on the platform."
    },
    5: {
      title: "5. Intellectual property",
      body:
        "Books, e-books, journals, digital resources, as well as the design and features of the platform are protected by intellectual property law.\n\nUnless otherwise stated, you only obtain a strictly personal and non-transferable right of use. Any unauthorised reproduction, distribution or exploitation is prohibited."
    },
    6: {
      title: "6. Account suspension or closure",
      body:
        "In the event of a breach of these Terms or of abusive behaviour, we may temporarily restrict your access, suspend certain features or close your account.\n\nYou may also request the deletion of your account via the settings or by contacting us at the address indicated in the Privacy Policy."
    },
    7: {
      title: "7. Applicable law and jurisdiction",
      body:
        "These Terms are governed by the law in force in Madagascar.\n\nIn the event of a dispute, we give priority to seeking an amicable solution before referring the matter to the competent courts of Antananarivo."
    }
  },

  // ===== Privacy Policy =====
  privacy: {
    1: {
      title: "1. Data we collect",
      body:
        "We collect the information that you provide directly (for example when creating an account, placing an order or contacting us) as well as data related to your use of the platform (consultation of books, borrowing and purchase history, preferences, etc.).\n\nThis may include identification data (surname, first name, email), account data (encrypted password), usage data (pages viewed, searches, clicks) and transaction data (borrowing or purchase history, payments)."
    },
    2: {
      title: "2. How we use your data",
      body:
        "Your data is used to provide and improve library services, manage your account and history, inform you about your borrowings, reservations or orders, personalise certain reading recommendations, and comply with our legal and security obligations.\n\nWe only process your data when it is necessary for the operation of the platform, for the execution of the services requested or to meet legal or regulatory obligations."
    },
    3: {
      title: "3. Data hosting and sharing",
      body:
        "The platform is hosted by technical service providers, who may be located outside Madagascar. When data is transferred outside the country, we strive to ensure that appropriate data-protection safeguards are in place.\n\nWe do not sell your personal data. It may be shared only with our technical providers (hosting, payment, emailing, analytics), with competent authorities where required by law, or with our institutional partners in the form of aggregated and anonymised statistics."
    },
    4: {
      title: "4. Data retention period",
      body:
        "Your data is kept for the period strictly necessary to manage the library, your account and the services you use, then archived or anonymised according to legal requirements and our statistical monitoring needs.\n\nCertain data may be kept for a longer period when required by law (for example in accounting or litigation matters)."
    },
    5: {
      title: "5. Your rights",
      body:
        "Within the limits set by applicable law, you have a right of access, rectification, erasure (in certain cases), opposition or restriction of some processing operations, as well as a right to data portability.\n\nTo exercise your rights or ask a question about the protection of your data, you can contact us at the following address: privacy@bibliotheque-mada.mg."
    }
  },

  // ===== Cookies Policy =====
  cookies: {
    1: {
      title: "1. What is a cookie?",
      body:
        "A cookie is a small text file stored on your device (computer, smartphone, tablet) when you consult the platform.\n\nIt allows certain information to be remembered in order to make your browsing easier and to measure the audience of the site."
    },
    2: {
      title: "2. Types of cookies we use",
      body:
        "We may use different types of cookies:\n\n– strictly necessary cookies, essential for the technical operation of the site (authentication, security, session persistence, etc.);\n– preference cookies, which remember your choices (language, display, last opened tab, etc.);\n– analytics or audience-measurement cookies, which help us understand how the platform is used so that we can improve it."
    },
    3: {
      title: "3. Managing your cookies",
      body:
        "On your first visit, an information banner may ask you to choose your preferences regarding non-essential cookies.\n\nYou can change your choices at any time from your browser settings (deletion or blocking of cookies) and, where available, from the cookie-management module displayed on the platform."
    },
    4: {
      title: "4. Consequences of refusing cookies",
      body:
        "Refusing certain cookies may limit some features of the platform (for example, automatic login or saving of display preferences).\n\nHowever, the main library features should generally remain accessible."
    }
  }
}
,

  "config": {
    "platformName": "Bibliothèque Numérique Mada",
    "lastUpdate": "Last updated: November 25, 2025",
    "jurisdiction": "Governing law: Madagascar"
  },
  "ui": {
    "headerTitle": "Technical documentation",
    "headerIntro": "Learn more about the technical structure of the platform, main concepts and integration best practices.",
    "searchButton": "Search in the documentation",
    "searchHint": "Use technical keywords (API, authentication, role, etc.) to filter sections.",
    "tocTitle": "Table of contents",
    "tocHint": "Click on an item to jump to the section.",
    "tocSections": "Sections",
    "bookmarksTitle": "Bookmarks",
    "searchEmpty": "Type a term to search in the documentation.",
    "searchNoResult": "No result found for “{{query}}”.",
    "searchResultsCount": "{{count}} result(s) found in the documentation.",
    "searchHistoryTitle": "Recent searches",
    "clearHistory": "Clear",
    "highlightToggle": "Highlight",
    "sectionDone": "Read",
    "sectionFav": "Favorite",
    "markRead": "Mark as read",
    "markUnread": "Mark as unread",
    "noSections": "No documentation section available.",
    "readingNow": "You are reading: {{tab}}",
    "footerQuestion": "Questions about the documentation? Contact us at {{email}}.",
    "printFull": "Print documentation",
    "copyAll": "Copy all documentation"
  },
  "tabs": {
    "overview": "Overview",
    "architecture": "Architecture",
    "api": "API & Integrations"
  },
  "sections": {
    "overview_intro": {
      "title": "Platform overview",
      "body": "This documentation presents the Bibliothèque Numérique Mada, a platform dedicated to browsing, managing and publishing digital resources.\n\nIt explains the main concepts, module structure and general technical usage rules."
    },
    "overview_roles": {
      "title": "User roles and profiles",
      "body": "The platform defines several roles: basic user, librarian, administrator and possibly institutional partners.\n\nEach role has specific rights in terms of reading, editing, validation and administration."
    },
    "architecture_frontend": {
      "title": "Frontend architecture",
      "body": "The user interface is built with React and a modular, component-based approach.\n\nThe design relies on Tailwind CSS, with glassmorphism elements and light/dark themes."
    },
    "architecture_backend": {
      "title": "Backend architecture",
      "body": "The server side exposes a secured REST API, handling authentication, resource management (books, articles, media) and admin operations.\n\nAll communication between frontend and backend goes through this API."
    },
    "api_auth": {
      "title": "Authentication & security",
      "body": "Access to protected resources requires authentication. Depending on configuration, this may rely on tokens, sessions or a hybrid system.\n\nPasswords must be stored securely, and sensitive API calls must be protected (HTTPS, permission checks)."
    },
    "api_endpoints": {
      "title": "Main API endpoints",
      "body": "The detailed API endpoints (list, parameters, return codes) are documented separately or via tools like Swagger/OpenAPI.\n\nThis section simply reminds that it is recommended to use standard API clients and to limit unnecessary calls for better performance."
    }
  }

,
// en/resources.json

  "faq": {
    "faq": {
      "badge": "FAQ & quick help",
      "headerTitle": "Frequently asked questions",
      "headerIntro": "A simple, user-friendly page with answers to the most common questions about how to use the platform.",
      "headerHelper": "Click on a question to display the answer. This FAQ complements the technical documentation and legal policies but does not replace them.",
      "blockTitle": "Common questions",
      "blockSubtitle": "Quick help for sign-up, login and support.",
      "counterLabel": "{{count}} listed question(s).",
      "empty": "No question has been added yet. You can populate this FAQ with feedback from your users.",
      "footerInfo": "This FAQ is designed as a user help space: it explains, in simple terms, the steps to follow to use the platform on a daily basis. It complements the technical documentation and legal policies but does not replace them.",
      "items": {
        "create_account": {
          "question": "How do I create an account on the platform?",
          "answer": "Click on the sign-up button, fill in the required fields (name, email, password) and validate. You will receive, if needed, a confirmation email."
        },
        "forgot_password": {
          "question": "What should I do if I forgot my password?",
          "answer": "Use the “Forgot password” link on the login page. Enter your email address to receive a reset link."
        },
        "contact_support": {
          "question": "How can I contact support?",
          "answer": "You can use the platform’s contact form or send an email to the support address indicated in the Contact section of the site."
        }
      }
    }
  }
,
// en/resources.json
   

  "userGuide": {
    "badge": "User guide",
    "headerTitle": "Getting started with the platform",
    "headerIntro": "A step-by-step guide to help new users: sign-up, navigation, profile management and access to key features.",
    "helperText": "This page is a practical guide for end-users, not a legal document. Its goal is to make onboarding as simple as possible.",
    "tutorialHint": "You can add here a link to a tutorial video or an introductory webinar.",
    "flowTitle": "User journey",
    "flowIntro": "This guide summarises the main onboarding steps. Adapt the content depending on your roles (reader, contributor, administrator) and the modules enabled on the platform.",
    "steps": {
      "step1": {
        "title": "Create an account and sign in",
        "body": "Click on the sign-up button, fill in the required information and submit. Once your account is created, use your credentials to sign in to the platform."
      },
      "step2": {
        "title": "Browse the content",
        "body": "From the home page, access the available articles, resources and tools. Use the search bar or filters to quickly find what you need."
      },
      "step3": {
        "title": "Manage your profile",
        "body": "From the settings section, you can update your personal information, change your password and configure your notification preferences."
      }
    },
    "helpTitle": "Need additional help?",
    "helpBody": "Complete this page with screenshots, detailed step-by-step guides or links to the FAQ and legal policies. You can also specify support contacts or opening hours."
  }

,


              "role_permissions_management": "Role Permissions Management",
            "manage_role_permissions_description": "Manage associations between roles and permissions",
            "search_roles_permissions": "Search roles and permissions...",
            "advanced_filters": "Advanced Filters",
            "active_filters": "Active Filters",
            "assign_permission_to_role": "Assign a permission to a role",
            "remove_permission_from_role": "Remove permission from role",
            "confirm_remove_permission": "Confirm permission removal",
            "from_role": "from role",
            "granted_by": "Granted by",
            "granted_at": "Granted on",
            "resource_action": "Resource/Action",
            "system": "System",
            "all_roles": "All Roles",
            "all_permissions": "All Permissions",
            "all_users": "All Users",
            "system_default": "System Default",
            "no_role_permissions_found": "No associations found",
            "no_role_permissions_match_search": "No associations match your search",
            "error_creating_role_permission": "Error creating association",
            "error_deleting_role_permission": "Error deleting association",
            "permissions_management": "Permissions Management",
            "click_resource_to_manage": "Click on a resource to configure its permissions",
            "tap_to_configure": "Configure",
            "tap_to_collapse": "Hide actions",
            "resource": "Resource",
            "action": "Action",
            "no_resources_found": "No resources found",
            "green_button_granted": "Green button = permission granted",
            "gray_button_not_granted": "Gray button = not granted",
            "spinner_saving": "Spinner = saving in progress",
            "revoke": "Revoke",
            "grant": "Grant",
            "update_permission_error": "Failed to update. Please check your connection.",
            "permission_not_found": "Permission not found for this action.",
            "resources": {
              "users": "Users",
              "roles": "Roles",
              "permissions": "Permissions",
              "posts": "Posts"
            }
,
          "permissions_management": "Permissions Management",
          "click_resource_to_manage": "Click on a resource to configure its permissions",
          "filter_roles": "Filter roles",
          "all": "All",
          "clear_selection": "Clear",
          "tap_to_configure": "Configure",
          "tap_to_collapse": "Hide actions",
          "resource": "Resource",
          "action": "Action",
          "no_resources_found": "No resources found",
          "green_button_granted": "Green button = permission granted",
          "gray_button_not_granted": "Gray button = not granted",
          "spinner_saving": "Spinner = saving in progress",
          "revoke": "Revoke",
          "grant": "Grant",
          "update_permission_error": "Failed to update. Please check your connection.",
          "permission_not_found": "Permission not found for this action.",
          "create": "Create",
          "read": "Read",
          "edit": "Edit",
          "delete": "Delete",
          "users": "Users",
          "roles": "Roles",
          "permissions": "Permissions",
          "posts": "Posts",
          
        
        "forgot_password": "Forgot password",
        "forgot_password_help": "Enter your email. We will send you a link to reset your password.",
        "reset_link_sent": "If an account exists, a reset link has been sent.",
        "reset_password": "Reset password",
        "reset_password_sub": "Set a new password for your account.",
        "new_password": "New password",
        "confirm_password": "Confirm password",
        "password_updated": "Your password has been reset.",
        "back_to_login": "Back to login",
        "send": "Send",
        "save": "Save",
        "close": "Close",
        "cancel": "Cancel",
        "invalid_email": "Invalid email",
        "token_missing": "Missing or invalid token.",
        "unexpected_error": "Unexpected error",
        "security_tips_title": "Security tips",
        "security_tips_body": "Use at least 8 characters with uppercase, lowercase, numbers, and symbols.",

        "reset_password": "Reset password",
          "reset_password_sub": "Set a new password to secure your account.",
          "token_missing": "Missing or invalid token. Please restart the process.",
          "email_missing": "Missing email in link. Please restart the process.",
          "email": "Email",
          "locked": "Locked",
          "copy": "Copy",
          "copied": "Copied",
          "copy_email": "Copy email",
          "email_locked_note": "The email address comes from the reset link and cannot be changed.",
          "new_password": "New password",
          "confirm_password": "Confirm password",
          "capslock_on": "Caps Lock is on",
          "passwords_match": "Passwords match",
          "passwords_not_match": "Passwords do not match",
          "loading": "Loading",
          "save": "Save",
          "back_to_login": "Back to login",
          "success": "Success!",
          "password_updated": "Your password has been updated.",
          "security_tips_title": "Security tips",
          "security_tips_body": "Use at least 8 characters with uppercase, lowercase, numbers and symbols.",
          "password_strength_start": "Start typing your password",
          "strength_very_weak": "Very weak",
          "strength_weak": "Weak",
          "strength_good": "Good",
          "strength_strong": "Strong",
          "unexpected_error": "Unexpected error",

          "validation": {
              "required": "The {{field}} field is required.",
              "string": "The {{field}} field must be a string.",
              "max": {
                "string": "The {{field}} field must not exceed {{max}} characters."
              },
              "unique": "The {{field}} field is already in use."
            },
            "fields": {
              "name": "name",
              "description": "description"
            },
            "messages": {
              "name_required": "Name is required.",
              "name_too_long": "Name must not exceed 50 characters.",
              "description_too_long": "Description must not exceed 500 characters."
            }
        },

             
              
      },
      fr: {
        translation: {
          // Menu principal
          "home": "Accueil",
          "platform": "Plateforme",
          "genre": "Genre",
          "about": "À propos",

          // Sous-menu Plateforme
          "summary": "Résumé",
          "video": "Vidéo",
          "audio": "Audio",
          "podcast": "Podcast",

          // Sous-menu Genre
          "playdoier": "Playdoier",
          "fundraising": "Fundraising",
          "technical": "Technique",

          // Sous-menu À propos
          "structure": "Structure",
          "goals": "Objectifs",
          "members": "Membres",
          "contact": "Contact",

          // Section utilisateur
          "search": "Rechercher",
          "profile": "Profil",
          "settings": "Paramètres",
          "notifications": "Notifications",
          "logout": "Déconnexion",

          // Authentification
          "login": "Connexion",
          "signup": "Inscription",
          "welcome_back": "Content de vous revoir",
          "login_to_account": "Connectez-vous à votre compte",
          "create_account": "Créez votre compte",
          "join_community": "Rejoignez notre communauté dès maintenant",
          "email": "Adresse email",
          "password": "Mot de passe",
          "remember_me": "Se souvenir de moi",
          "forgot_password": "Mot de passe oublié ?",
          "no_account": "Pas encore de compte ?",
          "have_account": "Déjà un compte ?",
          "first_name": "Prénom",
          "last_name": "Nom",
          "confirm_password": "Confirmez le mot de passe",
          "accept_terms": "J'accepte les conditions d'utilisation",
          "login_with": "Ou connectez-vous avec",
          "signup_with": "Ou inscrivez-vous avec",
          "password_strength": "Force du mot de passe",
          "continue_with_google": "Continuer avec Google",
          "connect": "Se connecter",
          "register": "S'inscrire",

          // Auth errors
          "required": "Ce champ est obligatoire",
          "invalidEmail": "Email invalide",
          "passwordMinLength": "8 caractères minimum",
          "passwordMismatch": "Les mots de passe ne correspondent pas",
          "an_error_has_occurred": "Une erreur est survenue",
          "incorrect_credentials": "Identifiants incorrects",
          "failed_to_register": "Échec de l'inscription",
          "generic": "Une erreur est survenue",
          "invalid_credentials": "Identifiants incorrects",
          "registration_failed": "Échec de l'inscription",
          "invalid_session": "Session invalide",
          "logout_failed": "Échec de la déconnexion",
          "email_required": "L'email est requis",
          "password_required": "Le mot de passe est requis",
          "email_invalid": "Email invalide",
          "password_too_short": "Le mot de passe doit contenir au moins 8 caractères",
          "login_success": "Connexion réussie !",
          "registration_success": "Inscription réussie !",
          "logout_success": "Déconnexion réussie",
          "username_required": "Le nom d'utilisateur est requis",
          "username": "Nom d'utilisateur",

          // Auth messages
          "loading": "Chargement en cours...",

          // Langue
          "language": "Langue",
          
          // User Management
          "user_management": "Gestion des Utilisateurs",
          "manage_accounts_access": "Gérez les comptes et les accès",
          "global_search": "Recherche globale...",
          "my_profile": "Mon Profil",
          "edit_profile": "Modifier Profil",
          "user_list": "Liste des Utilisateurs",
          "permissions": "Permissions",
          "roles": "Rôles",
          "activity": "Activité",
          "administrator": "Administrateur",
          "message": "Message",
          "follow": "Suivre",
          "projects": "Projets",
          "tasks": "Tâches",
          "teams": "Équipes",
          "personal_information": "Informations Personnelles",
          "full_name": "Nom complet",
          "phone": "Téléphone",
          "birthdate": "Date de naissance",
          "address": "Adresse",
          "recent_activity": "Activité Récente",
          "successful_login": "Connexion réussie",
          "today_at": "Aujourd'hui à",
          "from_paris": "depuis Paris, France",
          "password_changed": "Mot de passe modifié",
          "yesterday_at": "Hier à",
          "skills": "Compétences",
          "add_skill": "Ajouter une compétence",
          "security_settings": "Paramètres de sécurité",
          "strong": "Fort",
          "edit": "Modifier",
          "two_factor_auth": "Authentification à deux facteurs",
          "role": "Rôle",
          "about": "À propos",
          "admin_description": "Responsable de l'administration système avec 5 ans d'expérience dans la gestion des utilisateurs et des permissions.",
          "search_user": "Rechercher un utilisateur...",
          "all_roles": "Tous les rôles",
          "new_user": "Nouvel utilisateur",
          "user": "Utilisateur",
          "status": "Statut",
          "last_activity": "Dernière activité",
          "actions": "Actions",
          "showing": "Affichage de",
          "to": "à",
          "of": "sur",
          "users": "utilisateurs",
          "previous": "Précédent",
          "next": "Suivant",
          "permissions_management": "Gestion des Permissions",
          "configure_role_access": "Configurez les accès pour chaque rôle",
          "save": "Enregistrer",
          "table": "Table",
          "read": "Lire",
          "create": "Créer",
          "update": "Modifier",
          "delete": "Supprimer",
          "all": "Tout",
          "special_permissions": "Permissions spéciales",
          "export_data": "Exporter des données",
          "export_data_desc": "Permet d'exporter les données système",
          "import_data": "Importer des données",
          "import_data_desc": "Permet d'importer des données dans le système",
          "manage_users": "Gérer les utilisateurs",
          "manage_users_desc": "Permet de créer/modifier/supprimer des utilisateurs",
          "manage_roles": "Gérer les rôles",
          "manage_roles_desc": "Permet de créer/modifier/supprimer des rôles",
          "system_settings": "Paramètres système",
          "system_settings_desc": "Permet de modifier les paramètres globaux",
          "backup_restore": "Sauvegarde/Restauration",
          "backup_restore_desc": "Permet de sauvegarder et restaurer le système",
          "roles_management": "Gestion des Rôles",
          "create_manage_roles": "Créez et gérez les rôles utilisateurs",
          "new_role": "Nouveau rôle",
          "role_name": "Nom du rôle",
          "description": "Description",
          "creation_date": "Date de création",
          "manage_content": "Gérer le contenu",
          "create_new_role": "Créer un nouveau rôle",
          "activity_log": "Journal d'Activité",
          "user_actions_history": "Historique des actions des utilisateurs",
          "filter": "Filtrer...",
          "export": "Exporter",
          "user_updated_permissions": "Sophie Martin a modifié les permissions du rôle 'Éditeur'",
          "permission": "Permission",
          "enabled": "Activé",
          "editor": "Éditeur",
          "guest": "Invité",
          "edit_profil": "Modifier le Profil",
          "save_changes": "Enregistrer",
          "uploading": "Envoi en cours...",
          "upload_success": "Photo mise à jour avec succès !",
          "upload_error": "Erreur lors de l'envoi de la photo",
          "invalid_format": "Format non supporté (JPEG, PNG ou GIF uniquement)",
          "file_too_large": "L'image est trop lourde (max 2MB)",
          "connection_error": "Erreur de connexion au serveur",
          "current_password": "Mot de passe actuel",
          "enter_current_password": "Entrez votre mot de passe actuel",
          "new_password": "Nouveau mot de passe",
          "enter_new_password": "Entrez votre nouveau mot de passe",
          "confirm_new_password": "Confirmez votre nouveau mot de passe",
          "password_requirements": "Doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un symbole",
          "two_factor_auth_description": "Protégez votre compte avec une couche de sécurité supplémentaire",
          "current_password_required": "Le mot de passe actuel est requis",
          "new_password_required": "Le nouveau mot de passe est requis",
          "confirm_password_required": "La confirmation du mot de passe est requise",
          "passwords_do_not_match": "Les mots de passe ne correspondent pas",
          "password_min_length_8": "Le mot de passe doit contenir au moins 8 caractères",
          "new_password_must_differ": "Le nouveau mot de passe doit être différent de l'actuel",
          "password_updated_successfully": "Mot de passe mis à jour avec succès",
          "unauthorized_action": "Action non autorisée",
          "error_occurred": "Une erreur est survenue",
          "title": "Informations du profil",
          "loading": "Chargement du profil...",
          "fetch_error": "Échec du chargement du profil",
          "update_error": "Échec de la mise à jour du profil",
          "validation_error": "Erreur de validation",
          "update_success": "Profil mis à jour avec succès !",
          "saving": "Sauvegarde en cours...",
          "username_placeholder": "Entrez votre nom d'utilisateur",
          "unique": "unique",
          "first_name_placeholder": "Entrez votre prénom",
          "last_name_placeholder": "Entrez votre nom",
          "email_placeholder": "Entrez votre email",
          "phone_placeholder": "Entrez votre téléphone",
          "address_placeholder": "Entrez votre adresse complète",
          "no_roles": "Aucun rôle assigné",
          "account_status": "Statut du compte",
          "inactive": "Compte désactivé",
          "email_verification": "Vérification email",
          "verified": "Email vérifié",
          "not_verified": "Email non vérifié",
          "email_not_verified": "Votre adresse email n'est pas vérifiée",
          "resend_email": "Renvoyer l'email",

          // User management
          "confirm_deletion": "Confirmer la suppression",
          "delete_user_confirmation": "Êtes-vous sûr de vouloir supprimer l'utilisateur {{name}} ?",
          "delete_warning_irreversible": "Cette action est irréversible. Toutes les données associées à cet utilisateur seront définitivement supprimées.",
          "deactivate_alternative_message": "Vous pouvez également désactiver cet utilisateur au lieu de le supprimer définitivement.",
          "deleting": "Suppression",
          "deactivating": "Désactivation",
          "activating": "Activation",
          "delete": "Supprimer",
          "deactivate": "Désactiver",
          "activate": "Activer",
          "user_deleted_successfully": "Utilisateur supprimé avec succès",
          "user_deactivated_successfully": "Utilisateur désactivé avec succès",
          "user_activated_successfully": "Utilisateur activé avec succès",
          "error_deleting_user": "Erreur lors de la suppression de l'utilisateur",
          "error_deactivating_user": "Erreur lors de la désactivation de l'utilisateur",
          "error_activating_user": "Erreur lors de l'activation de l'utilisateur",
          "error_updating_role": "Erreur lors de la mise à jour du rôle",
          "edit_role": "Modifier le rôle",
          "edit_user_role": "Modifier le rôle utilisateur",
          "change_role_for_user": "Changer le rôle pour {{name}}",
          "current_role": "Rôle actuel",
          "select_role": "Sélectionner un rôle",
          "loading_roles": "Chargement des rôles...",
          "updating": "Mise à jour",
          "update_role": "Mettre à jour le rôle",
          "role_updated_successfully": "Rôle mis à jour avec succès",
          "deactivate_user": "Désactiver l'utilisateur",
          "activate_user": "Activer l'utilisateur",
          "deactivate_user_confirmation": "Voulez-vous désactiver l'utilisateur {{name}} ?",
          "activate_user_confirmation": "Voulez-vous réactiver l'utilisateur {{name}} ?",
          "current_status": "Statut actuel",
          "deactivate_user_warning": "L'utilisateur ne pourra plus se connecter à l'application.",
          "activate_user_info": "L'utilisateur pourra à nouveau se connecter à l'application.",
          "assign_permissions": "Attribuer des permissions",
          "edit_role_permissions": "Modifier les permissions du rôle",
          "choose_role": "Choisissez un rôle...",
          "select_permissions": "Sélectionner des permissions",
          "search_permissions": "Rechercher des permissions...",
          "no_permissions_found": "Aucune permission trouvée",
          "permission_assigned_success": "Permissions attribuées avec succès",
          "create_role": "Créer un rôle",
          "enter_role_name": "Saisir le nom du rôle",
          "enter_description": "Saisir la description",
          "active_role": "Rôle actif",
          "name_required": "Le nom du rôle est requis",
          "name_too_long": "Le nom du rôle doit comporter 50 caractères ou moins",
          "characters": "caractères",
          "create": "Créer",
          "update": "Mettre à jour",
          "close": "Fermer",
          "enter_description_optional": "Saisissez une description (optionnel)",
          "description_too_long": "La description ne doit pas dépasser {{max}} caractères",
          "active_role_hint": "Si désactivé, ce rôle ne pourra pas être attribué.",
          "saving": "Enregistrement",
          "active": "Actif",
        "inactive": "Inactif",

              "roles_management": "Gestion des rôles",
              "create_manage_roles": "Créez et gérez les rôles de votre application",
              "new_role": "Nouveau rôle",
              "role_name": "Nom du rôle",
              "description": "Description",
              "users": "Utilisateurs",
              "creation_date": "Date de création",
              "status": "Statut",
              "actions": "Actions",
              "edit": "Modifier",
              "delete": "Supprimer",
              "loading": "Chargement...",
              "no_roles_found": "Aucun rôle trouvé",
              "search_by_name": "Rechercher par nom...",
              "confirm_delete": "Confirmer la suppression",
              "delete_role_confirmation": "Êtes-vous sûr de vouloir supprimer le rôle « {{name}} » ?",
              "cancel": "Annuler",
              "confirm": "Confirmer",
              "delete_error": "Erreur lors de la suppression",
              "active": "Actif",
              "inactive": "Inactif",

            "assign_role_to_user": "Attribuer un rôle à un utilisateur",
            "select_user": "Sélectionner un utilisateur",
            "select_role": "Sélectionner un rôle",
            "choose_user": "Choisir un utilisateur...",
            "choose_role": "Choisir un rôle...",
            "user_already_has_roles": "Cet utilisateur a déjà des rôles.",
            "user_has_no_role_yet": "Cet utilisateur n'a aucun rôle.",
            "assign_role": "Attribuer le rôle",
            "role_assigned_successfully": "Rôle attribué avec succès.",
            "failed_to_assign_role": "Échec de l'attribution du rôle.",
            "please_select_user": "Veuillez sélectionner un utilisateur.",
            "please_select_role": "Veuillez sélectionner un rôle.",
            "no_description": "Pas de description", 
            "failed_add_role": "Échec d'ajout du rôle.",
            "failed_remove_role": "Échec de suppression du rôle.",

           "loading_roles": "Chargement des rôles...",
            "search_users_or_roles": "Rechercher un utilisateur ou un rôle...",
            "confirm_delete": "Confirmer la suppression",
            "delete_confirmation": "Supprimer le rôle \"{{role}}\" pour l'utilisateur \"{{user}}\" ?",
            "cancel": "Annuler",
            "confirm": "Confirmer",
            "success_delete": "Rôle supprimé avec succès.",
            "error_delete": "Échec de la suppression du rôle.",
            "error_load": "Échec du chargement des rôles.",
            "no_roles_found": "Aucun rôle trouvé",
            "page_info": "Page {{current}} sur {{total}} ({{count}} résultat(s))",
            "roles_management": "Gestion des Rôles Utilisateurs",
            "user": "Utilisateur",
            "role": "Rôle",
            "description": "Description",
            "assigned_on": "Assigné le",
            "assigned_by": "Assigné par",
            "actions": "Actions",
            "me_indicator": "← MOI",

            "manage_roles_advanced": "Gérer les rôles",
          "advanced_role_management": "Gestion avancée des rôles",
          "edit_user": "Modifier l'utilisateur", 
          "user_settings": "Paramètres utilisateur",
          "delete_user": "Supprimer l'utilisateur", 
          "delete_role": "Supprimer le rôle",

        "permissions": "Permissions",
          "manage_permissions": "Gérer les permissions",
          "manage_role_permissions": "Gérer les permissions des rôles",
          "add_permission": "Ajouter une permission",
          "existing_permissions": "Permissions existantes",
          "role": "Rôle",
          "permission": "Permission",
          "granted_by": "Accordé par",
          "granted_at": "Accordé le",
          "grant_permission": "Accorder la permission",
          "fill_required_fields": "Veuillez remplir les champs obligatoires",
          "permission_granted_success": "Permission accordée avec succès",
          "failed_to_grant_permission": "Échec d'attribution de la permission",
          "confirm_delete_permission": "Confirmer la suppression de cette permission ?",
          "permission_removed": "Permission supprimée",
          "delete_failed": "Échec de la suppression",
          "select_role": "Sélectionner un rôle",
          "select_permission": "Sélectionner une permission",
          "no_permissions_granted": "Aucune permission accordée",

            "permissions_management": "Gestion des permissions",
            "manage_permissions_description": "Créez et gérez les permissions du système",
            "search_permissions_placeholder": "Rechercher par nom, ressource ou action...",
            "permission_details": "Détails de la permission",
            "no_description": "Aucune description",

  "Users": "Utilisateurs",
  "Revenue": "Revenus",
  "Growth": "Croissance",
  "noData": "Pas assez de données pour ce graphique",

  // Barre latérale + Visualiseur
"Library": "Bibliothèque",
"Open library": "Ouvrir la bibliothèque",
"Close": "Fermer",
"Search...": "Rechercher...",
"Clear": "Effacer",
"Files": "Fichiers",
"Tags": "Tags",
"Similar": "Similaires",
"No media found.": "Aucun média trouvé.",
"Tags not provided": "Tags non fournis",
"Add tag": "Ajouter un tag",
"Untitled": "Sans titre",
"Preview": "Aperçu",
"Media": "Médias",
"Metadata": "Métadonnées",
"Versions": "Versions",
"Statistics": "Statistiques",
"SEO": "SEO",
"No version available": "Aucune version disponible",
"Hide library": "Masquer la bibliothèque",
"Show library": "Afficher la bibliothèque",
"Fullscreen": "Plein écran",
"Download": "Télécharger",
"Share": "Partager",
"Oops, something went wrong.": "Oups, un problème est survenu.",
"Unknown error.": "Erreur inconnue.",

  "visualiseur": {
    "title": "Visualiseur",
    "back": "Retour",
    "refresh": "Actualiser",
    "fullscreen": "Plein écran", 
    "download": "Télécharger",
    "share": "Partager",
    "close": "Fermer",
    "loading": "Chargement...",
    "error": "Erreur",
    "articleNotFound": "Article introuvable",
    "protectedContent": "Contenu protégé",
    "passwordRequired": "Mot de passe requis",
    "enterPassword": "Entrez le mot de passe",
    "unlock": "Déverrouiller",
    "cancel": "Annuler",
    "incorrectPassword": "Mot de passe incorrect",
    "privateAccess": "Accès restreint",
    "noPermission": "Vous n'avez pas la permission de consulter cet article",
    "askAdmin": "Demandez une autorisation à un administrateur",
    "login": "Se connecter",
    "backButton": "Retour",
    "tips": "Astuce",
    "shortcuts": "Raccourcis : P, Entrée ou Ctrl+K",
    "missingId": "Identifiant/slug manquant dans l'URL.",
    "restrictedAccess": "Accès restreint — permission requise.",
    "authRequired": "Accès restreint — authentification requise.",
    "loadingError": "Erreur lors du chargement",
    "unlockError": "Erreur lors du déverrouillage.",
    "untitled": "Sans titre",
    "selectFile": "Sélectionnez un fichier",
    "attachment": "Pièce jointe",
    "debug": "Debug",
    "change": "changement",
    "other": "autre",
    "unknownAuthor": "Auteur inconnu",
    
    "tabs": {
      "preview": "Aperçu",
      "media": "Médias",
      "metadata": "Métadonnées",
      "versions": "Versions",
      "statistics": "Statistiques",
      "seo": "SEO"
    },
    
    "sidebar": {
      "hide": "Masquer la bibliothèque",
      "show": "Afficher la bibliothèque",
      "mediaCount": "{{count}} média",
      "mediaCount_plural": "{{count}} médias",
      "tags": "Tags",
      "similar": "Articles similaires",
      "manageTags": "Gérer les tags"
    },
    
    "media": {
      "noMedia": "Aucun média lié à cet article",
      "search": "Rechercher par titre, #id, type MIME, tag…",
      "filters": "Filtres",
      "reset": "Tout réinitialiser",
      "type": "Type",
      "allTypes": "Tous",
      "typeImage": "Image",
      "typeVideo": "Vidéo",
      "typeOther": "Autre",
      "featured": "Vedette",
      "allFeatured": "Tous",
      "featuredYes": "En vedette",
      "featuredNo": "Non vedette",
      "sort": "Tri",
      "sortDate": "Date",
      "sortTitle": "Titre",
      "sortSize": "Taille",
      "direction": "Direction",
      "desc": "Desc",
      "asc": "Asc",
      "grid": "Mode grille",
      "list": "Mode liste",
      "preview": "Aperçu",
      "open": "Ouvrir",
      "noResults": "Aucun média ne correspond aux filtres",
      "showFilters": "Afficher les filtres",
      "hideFilters": "Masquer les filtres"
    },
    
    "metadata": {
      "title": "Titre",
      "filename": "Nom du fichier",
      "mediaType": "Type de média",
      "status": "Statut",
      "visibility": "Visibilité",
      "creationDate": "Date de création",
      "lastModified": "Dernière modification",
      "publishedDate": "Publié le",
      "author": "Auteur",
      "mainCategory": "Catégorie principale",
      "tags": "Mots-clés (tags)",
      "readingTime": "Lecture (min)",
      "wordCount": "Nombre de mots",
      "id": "ID",
      "slug": "Slug"
    },
    
    "preview": {
      "noMedia": "Aucun média",
      "addMedia": "Aucun média n’est disponible pour l’instant. Veuillez consulter le contenu ci-dessous.",
      "articleContent": "Contenu de l'article",
      "highResolution": "Voir en haute résolution",
      "download": "Télécharger",
      "enlarge": "Agrandir l'aperçu",
      "playVideo": "Agrandir la vidéo",
      "enlargeMap": "Agrandir la carte"
    },
    
    "statistics": {
      "title": "Statistiques de l'article",
      "views": "Vues",
      "shares": "Partages",
      "comments": "Commentaires",
      "ratings": "Notes",
      "averageRating": "Note moyenne",
      "engagement": "Engagement",
      "engagementSubtitle": "Répartition des interactions",
      "popularTags": "Tags populaires",
      "tagUsage": "Usage global des tags",
      "history": "Historique",
      "actions": "Actions effectuées",
      "quality": "Qualité",
      "averageScore": "Note moyenne attribuée",
      "outOf5": "sur 5",
      "rating": "note",
      "rating_plural": "notes",
      "noEngagementData": "Aucune donnée d'engagement disponible",
      "noRatingData": "Aucune note disponible"
    },
    
    "details": {
      "title": "Détails du fichier",
      "author": "Auteur",
      "category": "Catégorie",
      "creationDate": "Date de création",
      "lastModified": "Dernière modification",
      "rate": "Noter",
      "editRating": "Modifier"
    }
  }
,

  "filters": {
    "search": {
      "ariaLabel": "Recherche d'articles",
      "placeholder": "Tapez pour rechercher...",
      "tip": "Astuce : « / » pour focus",
      "clear": "Effacer la recherche",
      "execute": "Lancer la recherche",
      "showHistory": "Afficher l'historique",
      "hideHistory": "Masquer l'historique",
      "recentSearches": "Recherches récentes",
      "clearHistory": "Effacer l'historique",
      "suggestions": "Suggestions",
    },
    "searchHints": {
      "example1": "Ex : ia startup after:2024-01-01",
      "example2": "Ex : author:\"Auteur #12\" tag:mobile",
      "example3": "Ex : category:\"Intelligence Artificielle\" rating>4",
      "tip": "Astuce : tapez \"/\" pour focaliser"
    },
    "view": {
      "grid": "Vue grille",
      "list": "Vue liste"
    },
    "itemsPerPage": "Éléments par page",
    "toggleFilters": "Afficher/Masquer les filtres",
    "filters": "Filtres",
    "export": "Exporter en CSV",
    "categories": "Catégories",
    "tags": "Tags",
    "authors": "Auteurs",
    "options": "Options",
    "dates": "Période",
    "rating": "Note",
    "saved": "Sauvegardes",
    "quickOptions": "Options rapides",
    "savedFilters": "Filtres sauvegardés",
    "resetAll": "Tout réinitialiser",
    "apply": "Appliquer",
    "reset": "Réinitialiser",
    "resetSection": "Réinitialiser {{section}}",
    "noOptions": "Aucun {{type}} disponible",
    "types": {
      "categories": "catégories",
      "tags": "tags",
      "authors": "auteurs"
    },
    "featuredOnly": "Vedettes uniquement",
    "pinnedOnly": "Épinglés uniquement",
    "unreadOnly": "Non lus uniquement",
    "startDate": "Date de début",
    "endDate": "Date de fin",
    "minRating": "Note minimale",
    "maxRating": "Note maximale",
    "saveCurrent": "Sauvegarder l'état actuel",
    "noSavedFilters": "Aucun filtre sauvegardé. Configurez vos filtres puis cliquez sur \"Sauvegarder l'état actuel\".",
    "loadFilter": "Charger le filtre : {{name}}",
    "deleteFilter": "Supprimer le filtre : {{name}}",
    "createdOn": "Créé le",
    "suggestedNames": {
      "featured": "vedettes",
      "pinned": "épinglés",
      "unread": "non lus",
      "period": "période",
      "rating": "note",
      "custom": "Filtre personnalisé"
    },
    "saveModal": {
      "title": "Sauvegarder le filtre",
      "description": "Donnez un nom descriptif à cette configuration de filtres.",
      "filterName": "Nom du filtre",
      "placeholder": "Ex: Articles IA récents"
    },
    "toasts": {
      "filtersApplied": "Filtres appliqués",
      "filtersReset": "Filtres réinitialisés",
      "filterSaved": "Filtre \"{{name}}\" sauvegardé",
      "saveError": "Erreur lors de la sauvegarde",
      "filterLoaded": "Filtre \"{{name}}\" chargé",
      "filterDeleted": "Filtre supprimé"
    }
  },
  "common": {
    "close": "Fermer",
    "cancel": "Annuler",
    "save": "Sauvegarder"
  }
,

  "gridcard": {
    "unknownAuthor": "Auteur inconnu",
    "author": "Auteur",
    "date": {
      "unknown": "—",
      "published": "Publié le",
      "updated": "Mis à jour"
    },
    "visibility": {
      "public": "Public",
      "private": "Privé",
      "passwordProtected": "Protégé par mot de passe",
      "unknown": "—",
      "label": "Visibilité"
    },
    "actions": {
      "read": "Lire",
      "enterPassword": "Entrer le mot de passe",
      "addFavorite": "Ajouter aux favoris",
      "removeFavorite": "Retirer des favoris",
      "addLike": "Ajouter aux likes",
      "removeLike": "Retirer des likes"
    },
    "badges": {
      "favorite": "Favori",
      "liked": "Aimé",
      "read": "Lu"
    },
    "stats": {
      "views": "Vues",
      "comments": "Commentaires",
      "shares": "Partages",
      "reviews": "avis"
    },
    "passwordModal": {
      "title": "Accès à « {{title}} »"
    }
  }
,

  "home": "Accueil",
  "platform": "Plateforme",
  "genre": "Genre",
  "about": "À propos",

  "summary": "Résumé",
  "video": "Vidéo",
  "audio": "Audio",
  "podcast": "Podcast",

  "search": "Rechercher",
  "profile": "Profil",
  "settings": "Paramètres",
  "notifications": "Notifications",
  "logout": "Déconnexion",

  "login": "Connexion",
  "signup": "Inscription",
  "email": "Adresse email",
  "password": "Mot de passe",

  "user_management": "Gestion des Utilisateurs",
  "roles": "Rôles",
  "permissions": "Permissions",

  "language": "Langue",
  "loading": "Chargement en cours..."
,
"infinite":"Infinie",
"paginated":"Paginée",
"none":"aucune"
,
// FR
notfound: {
  book: {
    title: "404 — Livre introuvable",
    subtitle: {
      before: "Nous avons fouillé les étagères. Le chemin ",
      after: " ne mène à aucun livre."
    }
  },
  default: {
    title: "404 — Page introuvable",
    subtitle: {
      before: "Nous avons cherché partout. Le chemin ",
      after: " n'existe pas."
    }
  },
  actions: {
    back: "Revenir",
    home: "Accueil",
    search: "Rechercher un livre"
  },
  tips: 'Astuce : appuyez sur <code>B</code> pour revenir, <code>H</code> pour l’accueil.'
}
,
// FR
notfound: {
  actions: {
    back: "Revenir",
    home: "Accueil",
    browseArticles: "Parcourir les articles",
    playGame: "Jouer au mini-jeu",
    closeGame: "Fermer le mini-jeu"
  },
  game: {
    help: "Utilisez les flèches (ou WASD) pour bouger la loupe et attraper le livre. +1 point à chaque capture."
  }
}
,
  "listtable": {
    "headers": {
      "image": "Image",
      "title": "Titre",
      "author": "Auteur",
      "category": "Catégorie",
      "published": "Publié le",
      "views": "Vues",
      "rating": "Note",
      "status": "Statut",
      "actions": "Actions"
    },
    "categories": {
      "ai": "Intelligence Artificielle",
      "startup": "Startup",
      "webdev": "Développement Web",
      "business": "Business",
      "mobile": "Mobile",
      "article": "Article"
    },
    "status": {
      "published": "Publié",
      "draft": "Brouillon",
      "unread": "Non lu"
    },
    "visibility": {
      "public": "Public",
      "private": "Privé",
      "passwordProtected": "Protégé par mot de passe",
      "unknown": "Inconnu"
    },
    "badges": {
      "featured": "À la une",
      "sticky": "Épinglé"
    },
    "stats": {
      "views": "vues",
      "reviews": "avis"
    },
    "date": {
      "created": "Créé le"
    },
    "actions": {
      "read": "Lire l'article",
      "share": "Partager",
      "addFavorite": "Ajouter aux favoris",
      "removeFavorite": "Retirer des favoris"
    },
    "empty": {
      "title": "Aucun article trouvé",
      "subtitle": "Essayez de modifier vos critères de recherche"
    }
  }
,

  "smartimage": {
    "loading": "Chargement de l'image...",
    "unavailable": "Image non disponible",
    "unavailableText": "Image non disponible", 
    "icon": "Cadre d'image"
  }
,
  "pagination": {
    "navigation": "Navigation de pagination",

    "showing": "Affichage <strong>{{start}}</strong>–<strong>{{end}}</strong> sur <strong>{{total}}</strong>",

    "itemsPerPage": "Éléments/page",

    "firstPage": "Première page",
    "previousPage": "Page précédente",
    "nextPage": "Page suivante",
    "lastPage": "Dernière page",

    "pageNumber": "Page {{number}}",
    "pages": "Pages",

    "jumpToPage": "Aller à la page",
    "jumpToPageAria": "Saisir le numéro de page",
    "jumpPlaceholder": "N° de page"
  }
,

  "passwordModal": {
    "defaultTitle": "Mot de passe requis",
    "description": "Cet article est protégé. Entrez le mot de passe pour continuer.",
    "close": "Fermer",
    "passwordLabel": "Mot de passe",
    "passwordPlaceholder": "••••••••",
    "rememberSession": "Mémoriser pendant la session",
    "cancel": "Annuler",
    "verifying": "Vérification…",
    "continue": "Continuer",
    "validation": {
      "required": "Veuillez saisir un mot de passe."
    },
    "errors": {
      "generic": "Une erreur est survenue lors de la vérification."
    }
  }
,

  "auth": {
    "hidePassword": "Masquer le mot de passe",
    "showPassword": "Afficher le mot de passe",
    "capsLock": "Verr. Maj activée",
    "useSuggestion": "Utiliser la suggestion",
    "resetPosition": "Replacer automatiquement",
    "passwordStrength": {
      "start": "Commencez à taper votre mot de passe",
      "veryWeak": "Très faible",
      "weak": "Faible",
      "good": "Bon",
      "strong": "Fort"
    },
    "passwordHints": {
      "minLength": "Au moins 8 caractères",
      "mixedCase": "Majuscules & minuscules",
      "number": "Au moins un chiffre",
      "specialChar": "Au moins un caractère spécial (!@#)"
    },
    "unique": {
      "emailAvailable": "Email disponible",
      "usernameAvailable": "Nom d'utilisateur disponible",
      "emailTaken": "Cet email est déjà utilisé",
      "usernameTaken": "Ce nom d'utilisateur est déjà pris",
      "checking": "Vérification…",
      "checkUnavailable": "Vérification indisponible"
    },
    "media": {
      "login": {
        "title": "Connexion",
        "subtitle": "Accédez à votre espace en toute sécurité"
      },
      "register": {
        "title": "Inscription",
        "subtitle": "Rejoignez la communauté et démarrez"
      },
      "fallback": {
        "title": "Vente de consommables d'imprimerie",
        "dtf": "DTF — Poudres & Films",
        "eco": "Éco-solvant — DX5/DX7",
        "sub": "Sublimation — Textile & transfert",
        "createAccount": "Créer un compte",
        "nameEmail": "Nom, prénom, e-mail",
        "uniqueUsername": "Nom d'utilisateur unique",
        "strongPassword": "Mot de passe robuste"
      }
    }
  }
,
"listtable": {
  "headers": {
    "image": "Image",
    "title": "Titre",
    "author": "Auteur",
    "category": "Catégorie",
    "published": "Publié le",
    "views": "Vues",
    "rating": "Note",
    "status": "Statut",
    "actions": "Actions"
  },
  "categories": {
    "ai": "Intelligence Artificielle",
    "startup": "Startup",
    "webdev": "Développement Web",
    "business": "Business",
    "mobile": "Mobile",
    "article": "Article"
  },
  "status": {
    "published": "Publié",
    "draft": "Brouillon",
    "unread": "Non lu"
  },
  "visibility": {
    "public": "Public",
    "private": "Privé",
    "passwordProtected": "Protégé par mot de passe",
    "unknown": "Inconnu"
  },
  "badges": {
    "featured": "À la une",
    "sticky": "Épinglé"
  },
  "stats": {
    "views": "vues",
    "reviews": "avis"
  },
  "date": {
    "created": "Créé le"
  },
  "actions": {
    "read": "Lire l'article",
    "share": "Partager",
    "addFavorite": "Ajouter aux favoris",
    "removeFavorite": "Retirer des favoris"
  },
  "empty": {
    "title": "Aucun article trouvé",
    "subtitle": "Essayez de modifier vos critères de recherche"
  },
  // NOUVELLES CLÉS MANQUANTES
  "responsive": {
    "width": "Largeur"
  },
  "columns": {
    "button": "Colonnes",
    "auto": "Auto",
    "custom": "Personnalisé",
    "alwaysOn": "Toujours visible",
    "reset": "Réinitialiser en auto"
  }
},
  layout: {
  brand: "Media Manager",
  subtitle: "Back Office Admin",

  titles: {
    dashboard: "Tableau de bord",
    settings: "Paramètres",
    platform: "Plateforme",
    articlesBo: "Gestion des articles",
    articleNew: "Nouvel article",
    trashed: "Corbeille",
    userManagement: "Utilisateurs & Accès",
    societesBo: "Gestion des sociétés",
    bureauxBo: "Gestion des bureaux",
    "orgNodesBo": "Organigramme"
  },

  sections: {
    media: "Contenus & Médias",
    settings: "Système & Paramètres",
    users: "Utilisateurs & Accès"
  },

  menu: {
    // Dashboard
    dashboard: "Tableau de bord",
"orgNodesBo": "Organigramme",
    // Contenu / articles
    platform: "Plateforme",
    articlesBo: "Articles (Back office)",
    articleNew: "Nouvel article",
    trashed: "Corbeille",
    categoriesTags: "Catégories & Tags",

    // Utilisateurs & rôles
    myProfile: "Mon profil",
    editProfile: "Modifier le profil",
    user_list: "Liste des utilisateurs",
    user_roles: "Rôles des utilisateurs",
    roles: "Rôles",
    permissions: "Permissions",
    activity_all: "Activité globale",

    // Sociétés / bureaux
    societesBo: "Sociétés",
    bureauxBo: "Bureaux"
  },

  storage: {
    used: "Stockage utilisé"
  },

  a11y: {
    openSidebar: "Ouvrir la barre latérale",
    closeSidebar: "Fermer la barre latérale",
    sidebar: "Navigation latérale",
    notifications: "Notifications",
    profile: "Profil"
  }
}

,


  "gridcard": {
    "actions": {
      "more": "Plus d’actions",
      "read": "Lire",
      "enterPassword": "Entrer le mot de passe",
      "addFavorite": "Ajouter aux favoris",
      "removeFavorite": "Retirer des favoris",
      "disableColor": "Désactiver la couleur",
      "enableColor": "Activer la couleur"
    },
    "menu": {
      "title": "Actions",
      "openNewTab": "Ouvrir dans un nouvel onglet",
      "copyLink": "Copier le lien",
      "share": "Partager"
    },
    "visibility": {
      "public": "Public",
      "private": "Privé",
      "passwordProtected": "Protégé par mot de passe",
      "unknown": "Inconnu",
      "label": "Visibilité"
    },
    "badges": {
      "favorite": "Favori",
      "read": "Lu"
    },
    "date": {
      "published": "Publié",
      "updated": "Mis à jour",
      "unknown": "Date inconnue"
    },
    "stats": {
      "views": "Vues",
      "comments": "Commentaires",
      "shares": "Partages",
      "reviews": "Avis"
    },
    "unknownAuthor": "Auteur inconnu",
    "author": "Auteur"
  }

,
legal: {
  config: {
    platformName: "Bibliothèque Numérique Mada",
    lastUpdate: "14 novembre 2025",
    country: "Madagascar",
    jurisdiction: "Antananarivo",
    contactEmail: "contact@bibliotheque-mada.mg",
    privacyEmail: "privacy@bibliotheque-mada.mg"
  },

  ui: {
    badge: "Informations légales",
    headerTitle: "Conditions générales et politique de confidentialité",
    headerIntro:
      "En créant un compte, vous acceptez nos Conditions générales d’utilisation, notre Politique de confidentialité et notre Politique d’utilisation des cookies.",
    tabs: {
      terms: "Conditions générales",
      privacy: "Politique de confidentialité",
      cookies: "Politique des cookies"
    },
    searchButton: "Rechercher",
    searchHint:
      "Recherche sur : Conditions générales, Politique de confidentialité et Politique des cookies.",
    searchPlaceholder:
      "Rechercher un terme (ex : compte, données, cookies…)",
    searchNoResult:
      "Aucun résultat trouvé pour « {{query}} » dans les Conditions générales, la Politique de confidentialité ou la Politique des cookies.",
    searchEmpty:
      "Tapez un mot-clé pour lancer une recherche dans les Conditions générales, la Politique de confidentialité et la Politique des cookies.",
    print: "Imprimer",
    copy: "Copier",
    copied: "Copié ✓",
    copyError: "Erreur",
    footerQuestion:
      "Des questions ? Contactez-nous à {{email}}"
  },

  // ===== CGU =====
  terms: {
    1: {
      title: "1. Objet des conditions générales",
      body:
        "Les présentes Conditions générales d’utilisation (les « Conditions ») définissent les règles applicables lorsque vous utilisez la plateforme Bibliothèque Numérique Mada pour consulter, emprunter, acheter ou gérer des livres et autres ressources documentaires.\n\nEn créant un compte ou en utilisant la plateforme, vous reconnaissez avoir pris connaissance de ces Conditions et les accepter sans réserve."
    },
    2: {
      title: "2. Accès à la plateforme",
      body:
        "La plateforme est accessible, en principe, 24h/24 et 7j/7, sauf opérations de maintenance, mises à jour ou événements indépendants de notre volonté.\n\nVous êtes responsable de votre matériel (ordinateur, téléphone, connexion Internet) et des coûts liés à l’accès au service."
    },
    3: {
      title: "3. Création et utilisation du compte",
      body:
        "Pour utiliser certaines fonctionnalités (emprunt, achat, historique, favoris, etc.), vous devez créer un compte personnel et fournir des informations exactes et à jour.\n\nVous êtes responsable de la confidentialité de votre mot de passe et de toute activité réalisée depuis votre compte. En cas de suspicion d’utilisation frauduleuse, vous devez nous en informer dans les meilleurs délais."
    },
    4: {
      title: "4. Comportement de l’utilisateur",
      body:
        "Vous vous engagez à utiliser la plateforme dans le respect de la loi et des droits d’autrui.\n\nSont notamment interdits : les propos injurieux, haineux, diffamatoires ou discriminatoires ; les activités illégales, frauduleuses ou trompeuses ; les tentatives de piratage, d’intrusion ou de perturbation du service ; ainsi que la violation des droits d’auteur ou des licences d’utilisation des contenus mis à disposition sur la plateforme."
    },
    5: {
      title: "5. Propriété intellectuelle",
      body:
        "Les livres, e-books, revues, ressources numériques, ainsi que le design et les fonctionnalités de la plateforme sont protégés par le droit de la propriété intellectuelle.\n\nSauf mention contraire, vous n’obtenez qu’un droit d’usage strictement personnel et non transférable. Toute reproduction, diffusion ou exploitation non autorisée est interdite."
    },
    6: {
      title: "6. Suspension ou fermeture de compte",
      body:
        "En cas de non-respect de ces Conditions ou de comportement abusif, nous pouvons limiter temporairement votre accès, suspendre certaines fonctionnalités ou fermer votre compte.\n\nVous pouvez également demander la suppression de votre compte via les paramètres ou en nous contactant à l’adresse indiquée dans la Politique de confidentialité."
    },
    7: {
      title: "7. Loi applicable",
      body:
        "Ces Conditions sont soumises au droit en vigueur à Madagascar.\n\nEn cas de litige, nous privilégions la recherche d’une solution amiable avant toute saisine des tribunaux compétents d’Antananarivo."
    }
  },

  // ===== Confidentialité =====
  privacy: {
    1: {
      title: "1. Données que nous collectons",
      body:
        "Nous collectons les informations que vous nous fournissez directement (par exemple lors de la création de compte, d’une commande ou d’une prise de contact) ainsi que des données liées à votre utilisation de la plateforme (consultation de livres, historique d’emprunts ou d’achats, préférences, etc.).\n\nIl peut s’agir notamment de données d’identification (nom, prénom, adresse e-mail), de données de compte (mot de passe chiffré), de données d’usage (pages consultées, recherches, clics) et de données de transaction (historique d’emprunts ou d’achats, paiements)."
    },
    2: {
      title: "2. Comment nous utilisons vos données",
      body:
        "Vos données sont utilisées pour fournir et améliorer les services de la bibliothèque, gérer votre compte et votre historique, vous informer sur vos emprunts, réservations ou commandes, personnaliser certaines recommandations de lecture et respecter nos obligations légales et de sécurité.\n\nNous ne traitons vos données que lorsque cela est nécessaire au fonctionnement de la plateforme, à l’exécution des services que vous avez demandés ou au respect d’obligations légales ou réglementaires."
    },
    3: {
      title: "3. Hébergement et partage de vos données",
      body:
        "La plateforme est hébergée chez des prestataires techniques, qui peuvent être situés en dehors de Madagascar. Lorsque des données sont transférées hors du pays, nous nous efforçons de mettre en place des garanties de protection adaptées.\n\nNous ne vendons pas vos données personnelles. Elles peuvent être partagées uniquement avec nos prestataires techniques (hébergement, paiement, e-mailing, analyse d’audience), avec les autorités compétentes lorsque la loi l’impose, ou avec nos partenaires institutionnels sous forme de statistiques agrégées et anonymisées."
    },
    4: {
      title: "4. Durée de conservation",
      body:
        "Vos données sont conservées pendant la durée strictement nécessaire à la gestion de la bibliothèque, de votre compte et des services que vous utilisez, puis archivées ou anonymisées selon les exigences légales et nos besoins de suivi statistique.\n\nCertaines données peuvent être conservées plus longtemps lorsqu’une obligation légale l’exige (par exemple en matière comptable ou de contentieux)."
    },
    5: {
      title: "5. Vos droits",
      body:
        "Dans les limites prévues par la loi applicable, vous disposez notamment d’un droit d’accès, de rectification, d’effacement (dans certains cas), d’opposition ou de limitation de certains traitements, ainsi que d’un droit à la portabilité de vos données.\n\nPour exercer vos droits ou poser une question sur la protection de vos données, vous pouvez nous contacter à l’adresse suivante : privacy@bibliotheque-mada.mg."
    }
  },

  // ===== Cookies =====
  cookies: {
    1: {
      title: "1. Qu’est-ce qu’un cookie ?",
      body:
        "Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, smartphone, tablette) lorsque vous consultez la plateforme.\n\nIl permet notamment de mémoriser certaines informations pour faciliter votre navigation et mesurer l’audience du site."
    },
    2: {
      title: "2. Types de cookies utilisés",
      body:
        "Nous pouvons utiliser différents types de cookies :\n\n– des cookies strictement nécessaires, indispensables au fonctionnement technique du site (authentification, sécurité, maintien de session, etc.) ;\n– des cookies de préférence, qui mémorisent vos choix (langue, affichage, dernier onglet consulté, etc.) ;\n– des cookies de mesure d’audience ou d’analyse, qui nous aident à comprendre comment la plateforme est utilisée afin de l’améliorer."
    },
    3: {
      title: "3. Gestion de vos cookies",
      body:
        "Lors de votre première visite, une bannière d’information peut vous inviter à choisir vos préférences en matière de cookies non essentiels.\n\nVous pouvez à tout moment modifier vos choix depuis les paramètres de votre navigateur (suppression ou blocage des cookies) et, lorsque cette fonction est disponible, via le module de gestion des cookies affiché sur la plateforme."
    },
    4: {
      title: "4. Impact du refus de certains cookies",
      body:
        "Le refus de certains cookies peut limiter certaines fonctionnalités de la plateforme (par exemple, la mémorisation automatique de votre session ou de certaines préférences d’affichage).\n\nLes principales fonctionnalités de consultation et d’emprunt devraient toutefois rester accessibles dans la plupart des cas."
    }
  }
}
,

  "config": {
    "platformName": "Bibliothèque Numérique Mada",
    "lastUpdate": "Dernière mise à jour : 25 novembre 2025",
    "jurisdiction": "Droit applicable : Madagascar"
  },
  "ui": {
    "headerTitle": "Documentation technique",
    "headerIntro": "Découvrez la structure technique de la plateforme, les principaux concepts et les bonnes pratiques d'intégration.",
    "searchButton": "Rechercher dans la documentation",
    "searchHint": "Utilisez des mots-clés techniques (API, authentification, rôle, etc.) pour filtrer les sections.",
    "tocTitle": "Sommaire",
    "tocHint": "Cliquez sur un élément pour accéder directement à la section.",
    "tocSections": "Sections",
    "bookmarksTitle": "Favoris",
    "searchEmpty": "Tapez un terme pour lancer une recherche dans la documentation.",
    "searchNoResult": "Aucun résultat trouvé pour « {{query}} ».",
    "searchResultsCount": "{{count}} résultat(s) trouvé(s) dans la documentation.",
    "searchHistoryTitle": "Dernières recherches",
    "clearHistory": "Effacer",
    "highlightToggle": "Surlignage",
    "sectionDone": "Lu",
    "sectionFav": "Favori",
    "markRead": "Marquer comme lu",
    "markUnread": "Marquer comme non lu",
    "noSections": "Aucune section de documentation disponible.",
    "readingNow": "Vous lisez : {{tab}}",
    "footerQuestion": "Une question sur la documentation ? Écrivez-nous à {{email}}.",
    "printFull": "Imprimer la documentation",
    "copyAll": "Copier toute la documentation"
  },
  "tabs": {
    "overview": "Vue d’ensemble",
    "architecture": "Architecture",
    "api": "API & Intégrations"
  },
  "sections": {
    "overview_intro": {
      "title": "Présentation de la plateforme",
      "body": "Cette documentation présente la Bibliothèque Numérique Mada, une plateforme destinée à la consultation, la gestion et la diffusion de ressources numériques.\n\nElle explique les concepts principaux, la structure des modules, ainsi que les règles générales d’utilisation technique."
    },
    "overview_roles": {
      "title": "Rôles et profils utilisateurs",
      "body": "La plateforme distingue plusieurs rôles : utilisateur simple, bibliothécaire, administrateur et éventuellement partenaires institutionnels.\n\nChaque rôle dispose de droits spécifiques en matière de lecture, d’édition, de validation et d’administration."
    },
    "architecture_frontend": {
      "title": "Architecture frontend",
      "body": "L’interface utilisateur est développée avec React, en utilisant une approche modulaire et des composants réutilisables.\n\nLe design repose sur Tailwind CSS, avec des éléments de type « glassmorphism » et un thème clair/sombre."
    },
    "architecture_backend": {
      "title": "Architecture backend",
      "body": "La partie serveur expose une API REST sécurisée, chargée de l’authentification, de la gestion des ressources (livres, articles, médias) et des opérations d’administration.\n\nLes communications entre le frontend et le backend se font exclusivement via cette API."
    },
    "api_auth": {
      "title": "Authentification & sécurité",
      "body": "L’accès aux ressources protégées nécessite une authentification. Selon la configuration, celle-ci peut reposer sur des jetons (tokens), des sessions ou un système hybride.\n\nLes mots de passe doivent être stockés de manière sécurisée et les appels sensibles à l’API doivent être protégés (HTTPS, vérification des permissions)."
    },
    "api_endpoints": {
      "title": "Principaux endpoints API",
      "body": "La documentation technique détaillée des endpoints API (liste, paramètres, codes de retour) est fournie dans un document séparé ou via un outil comme Swagger/OpenAPI.\n\nCette section rappelle simplement qu’il est recommandé d’utiliser des clients API standard et de limiter les appels superflus pour de meilleures performances."
    }
  }
,
"faq": {
    "faq": {
      "badge": "FAQ & aide rapide",
      "headerTitle": "Foire aux questions",
      "headerIntro": "Une page simple et pédagogique pour répondre aux questions les plus fréquentes sur l’utilisation de la plateforme.",
      "headerHelper": "Cliquez sur une question pour afficher la réponse. Cette FAQ complète la documentation technique, elle n’a pas valeur de texte légal.",
      "blockTitle": "Questions fréquentes",
      "blockSubtitle": "Une aide rapide pour l’inscription, la connexion et le support.",
      "counterLabel": "{{count}} question(s) listée(s).",
      "empty": "Aucune question enregistrée pour le moment. Vous pouvez alimenter cette FAQ à partir des retours utilisateurs.",
      "footerInfo": "Cette FAQ est pensée comme un espace d’aide utilisateur : elle vulgarise les étapes à suivre pour utiliser la plateforme au quotidien. Elle complète la documentation technique et les politiques légales, mais ne les remplace pas.",
      "items": {
        "create_account": {
          "question": "Comment créer un compte sur la plateforme ?",
          "answer": "Cliquez sur le bouton d’inscription, renseignez les champs requis (nom, email, mot de passe) puis validez. Vous recevrez, le cas échéant, un email de confirmation."
        },
        "forgot_password": {
          "question": "Que faire si j’ai oublié mon mot de passe ?",
          "answer": "Utilisez le lien « Mot de passe oublié » sur la page de connexion. Entrez votre adresse email pour recevoir un lien de réinitialisation."
        },
        "contact_support": {
          "question": "Comment contacter le support ?",
          "answer": "Vous pouvez utiliser le formulaire de contact de la plateforme ou envoyer un email à l’adresse de support indiquée dans la rubrique Contact du site."
        }
      }
    }
  }
,
  "userGuide": {
    "badge": "Guide d’utilisation",
    "headerTitle": "Bien démarrer avec la plateforme",
    "headerIntro": "Un guide pas à pas pour accompagner les nouveaux utilisateurs : inscription, navigation, gestion du profil et accès aux fonctionnalités clés.",
    "helperText": "Cette page est un guide pratique pour les utilisateurs, ce n’est pas un document juridique. Elle a pour but de rendre la prise en main la plus simple possible.",
    "tutorialHint": "Vous pourrez ajouter ici un lien vers une vidéo tutorielle ou un webinaire d’introduction.",
    "flowTitle": "Parcours utilisateur",
    "flowIntro": "Ce guide résume les principales étapes de prise en main. Adaptez le contenu en fonction de vos rôles (lecteur, contributeur, administrateur) et des modules activés sur la plateforme.",
    "steps": {
      "step1": {
        "title": "Créer un compte et se connecter",
        "body": "Cliquez sur le bouton d’inscription, renseignez les informations demandées puis validez. Une fois votre compte créé, utilisez vos identifiants pour vous connecter à la plateforme."
      },
      "step2": {
        "title": "Parcourir les contenus",
        "body": "Depuis la page d’accueil, accédez aux articles, ressources et outils disponibles. Utilisez le moteur de recherche ou les filtres pour trouver rapidement ce qui vous intéresse."
      },
      "step3": {
        "title": "Gérer votre profil",
        "body": "Depuis la section paramètres, vous pouvez mettre à jour vos informations personnelles, changer votre mot de passe et configurer vos préférences de notification."
      }
    },
    "helpTitle": "Besoin d’aide supplémentaire ?",
    "helpBody": "Complétez cette page avec des captures d’écran, des pas-à-pas détaillés ou des liens vers la FAQ et les politiques légales. Vous pouvez également préciser les contacts de support ou les horaires d’assistance."
   }

,

// === Navbar & Notifications (clés manquantes) ===
"moderation": "Modération",
"hello": "Bonjour",
"open": "Ouvrir",
"to_moderate": "à modérer",
"activities": "Activités",
"pending": "À modérer",
"pending_item": "Élément à modérer",
"no_activity": "Aucune activité pour le moment",
"nothing_to_moderate": "Rien à modérer",
"see_all": "Tout voir",
"mark_all_read": "Tout marquer lu",
"see_more": "Voir plus",
"No_more": "Fin",        // si tu préfères tout en minuscules, utilise "no_more"
"no_more": "Fin",

// Helpers "time-ago"
"just_now": "à l'instant",
"x_min_ago": "il y a {{x}} min",
"x_h_ago": "il y a {{x}} h",

// Aliases / typos
"sumary": "Résumé",          // alias si le code appelle 'sumary'
"playdoier": "Plaidoyer"     // meilleure étiquette FR
,
        "role_permissions_management": "Gestion des Permissions de Rôles",
        "manage_role_permissions_description": "Gérer les associations entre rôles et permissions",
        "search_roles_permissions": "Rechercher rôles et permissions...",
        "advanced_filters": "Filtres avancés",
        "active_filters": "Filtres actifs",
        "assign_permission_to_role": "Assigner une permission à un rôle",
        "remove_permission_from_role": "Retirer la permission du rôle",
        "confirm_remove_permission": "Confirmer la suppression de la permission",
        "from_role": "du rôle",
        "granted_by": "Accordé par",
        "granted_at": "Accordé le",
        "resource_action": "Ressource/Action",
        "system": "Système",
        "all_roles": "Tous les rôles",
        "all_permissions": "Toutes les permissions",
        "all_users": "Tous les utilisateurs",
        "system_default": "Système par défaut",
        "no_role_permissions_found": "Aucune association trouvée",
        "no_role_permissions_match_search": "Aucune association ne correspond à votre recherche",
        "error_creating_role_permission": "Erreur lors de la création de l'association",
        "error_deleting_role_permission": "Erreur lors de la suppression de l'association",
        "permissions_management": "Gestion des Permissions",
          "click_resource_to_manage": "Cliquez sur une ressource pour configurer ses permissions",
          "tap_to_configure": "Configurer",
          "tap_to_collapse": "Masquer les actions",
          "resource": "Ressource",
          "action": "Action",
          "no_resources_found": "Aucune ressource trouvée",
          "green_button_granted": "Bouton vert = permission accordée",
          "gray_button_not_granted": "Bouton gris = non accordée",
          "spinner_saving": "Animation = en cours d’enregistrement",
          "revoke": "Révoquer",
          "grant": "Accorder",
          "update_permission_error": "Échec de la mise à jour. Vérifiez votre connexion.",
          "permission_not_found": "Permission non trouvée pour cette action.",
          "resources": {
            "users": "Utilisateurs",
            "roles": "Rôles",
            "permissions": "Permissions",
            "posts": "Articles"
          },

            "permissions_management": "Gestion des Permissions",
          "click_resource_to_manage": "Cliquez sur une ressource pour configurer ses permissions",
          "filter_roles": "Filtrer les rôles",
          "all": "Tous",
          "clear_selection": "Effacer",
          "tap_to_configure": "Configurer",
          "tap_to_collapse": "Masquer les actions",
          "resource": "Ressource",
          "action": "Action",
          "no_resources_found": "Aucune ressource trouvée",
          "green_button_granted": "Bouton vert = permission accordée",
          "gray_button_not_granted": "Bouton gris = non accordée",
          "spinner_saving": "Animation = en cours d’enregistrement",
          "revoke": "Révoquer",
          "grant": "Accorder",
          "update_permission_error": "Échec de la mise à jour. Vérifiez votre connexion.",
          "permission_not_found": "Permission non trouvée pour cette action.",
          "create": "Créer",
          "read": "Lire",
          "edit": "Modifier",
          "delete": "Supprimer",
          "users": "Utilisateurs",
          "roles": "Rôles",
          "permissions": "Permissions",
          "posts": "Articles",

          "forgot_password": "Mot de passe oublié",
          "forgot_password_help": "Entrez votre e-mail. Nous vous enverrons un lien pour réinitialiser votre mot de passe.",
          "reset_link_sent": "Si un compte existe, un lien de réinitialisation a été envoyé.",
          "reset_password": "Réinitialiser le mot de passe",
          "reset_password_sub": "Définissez un nouveau mot de passe pour votre compte.",
          "new_password": "Nouveau mot de passe",
          "confirm_password": "Confirmer le mot de passe",
          "password_updated": "Votre mot de passe a été réinitialisé.",
          "back_to_login": "Retour à la connexion",
          "send": "Envoyer",
          "save": "Enregistrer",
          "close": "Fermer",
          "cancel": "Annuler",
          "invalid_email": "Email invalide",
          "token_missing": "Jeton manquant ou invalide.",
          "unexpected_error": "Erreur inattendue",

           "reset_password": "Réinitialiser le mot de passe",
          "reset_password_sub": "Définissez un nouveau mot de passe pour sécuriser votre compte.",
          "token_missing": "Jeton manquant ou invalide. Veuillez relancer la procédure.",
          "email_missing": "Email manquant dans le lien. Relancez la procédure.",
          "email": "Email",
          "locked": "Verrouillé",
          "copy": "Copier",
          "copied": "Copié",
          "copy_email": "Copier l'email",
          "email_locked_note": "L’adresse e-mail est définie par le lien de réinitialisation et ne peut pas être modifiée.",
          "new_password": "Nouveau mot de passe",
          "confirm_password": "Confirmer le mot de passe",
          "capslock_on": "Verr. Maj activée",
          "passwords_match": "Les mots de passe correspondent",
          "passwords_not_match": "Les mots de passe ne correspondent pas",
          "loading": "Chargement",
          "save": "Enregistrer",
          "back_to_login": "Retour à la connexion",
          "success": "Succès !",
          "password_updated": "Votre mot de passe a été réinitialisé.",
          "security_tips_title": "Conseils de sécurité",
          "security_tips_body": "Utilisez au moins 8 caractères, avec majuscules, minuscules, chiffres et symboles.",
          "password_strength_start": "Commencez à taper votre mot de passe",
          "strength_very_weak": "Très faible",
          "strength_weak": "Faible",
          "strength_good": "Bon",
          "strength_strong": "Fort",
          "unexpected_error": "Erreur inattendue",

          "security_tips_title": "Conseils de sécurité",
        "security_tips_body": "Utilisez au moins 8 caractères, avec majuscules, minuscules, chiffres et symboles.",

        "validation": {
            "required": "Le champ {{field}} est requis.",
            "string": "Le champ {{field}} doit être une chaîne de caractères.",
            "max": {
              "string": "Le champ {{field}} ne doit pas dépasser {{max}} caractères."
            },
            "unique": "Le {{field}} est déjà utilisé."
          },
          "fields": {
            "name": "nom",
            "description": "description"
          },
          "name_required": "Le nom est requis",
          "name_too_long": "Le nom ne doit pas dépasser 50 caractères",
          "description_too_long": "La description ne doit pas dépasser 500 caractères"
        },

          "roles_management": "Role Management",
  
      },

      
             

    },
    lng: "fr", // Langue par défaut
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;