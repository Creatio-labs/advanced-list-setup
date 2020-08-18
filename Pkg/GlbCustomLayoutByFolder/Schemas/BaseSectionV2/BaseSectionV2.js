define("BaseSectionV2", ["GridUtilitiesV2"],
	function() {
		return {
			diff: /**SCHEMA_DIFF*/[]/**SCHEMA_DIFF*/,
			methods: {
				init: function() {
					var parentMethod = this.getParentMethod(this, arguments);
					this.glbLoadCustomFolderProfileKeys(function() {
						parentMethod();
					});
				},
				onRender: function() {
					if (this.get("GridSettingsChanged") === true) {
						this.glbHandleCustomGridSettingsChange();
					}
					this.callParent(arguments);
				},
				glbHandleCustomGridSettingsChange: function() {
					var newProfile = this.get("Profile");
					var customFolderProfileKeys = this.get("GlbCustomFolderProfileKeys");
					if (this.glbIsProfileEmpty(newProfile) !== true &&
							this.Ext.isEmpty(customFolderProfileKeys) !== true) {
						var savedProfile = customFolderProfileKeys.find(newProfile.key);
						if (this.Ext.isEmpty(savedProfile) !== true) {
							customFolderProfileKeys.removeByKey(newProfile.key);
						}
						customFolderProfileKeys.add(newProfile.key, newProfile);
					}
				},
				/**
				 * @inheritdoc GridUtilitiesV2#onFilterUpdate
				 * @overridden
				 */
				onFilterUpdate: function(filterKey, filterItem, folderInfo) {
					if (this.ignoreFilters()) {
						return;
					}
					this.set("GridSettingsChanged", true);
					if (this.Ext.isEmpty(this.get("CurrentFolder")) && !this.Ext.isEmpty(folderInfo) &&
							folderInfo.length > 0) {
						this.set("CurrentFolder", folderInfo[0]);
					}
					
					if (filterKey === "FolderFilters" && filterItem.isEmpty()) {
						this.set("CurrentFolder", null);
					}
					this.glbSetActiveFolderProfile();
					this.callParent(arguments);
				},
				/**
				 * @inheritdoc Terrasoft.BaseSectionV2#getProfileKey
				 * @overridden
				 */
				getProfileKey: function() {
					var currentFolder = this.get("CurrentFolder");
					var currentTabName = this.getActiveViewName();
					if (currentTabName !== this.get("AnalyticsDataViewName") && !this.Ext.isEmpty(currentFolder)) {
						var customProfileKey = this.glbGetCustomFolderProfileKey(currentFolder.value);
						return customProfileKey;
					}
					return this.callParent(arguments);
				},
				glbGetCustomProfileByFolderId: function(folderId) {
					var folderProfileKey = this.glbGetCustomFolderProfileKey(folderId);
					return this.glbGetProfileByKey(folderProfileKey);
				},
				glbGetProfileByKey: function(key) {
					var customFolderProfileKeys = this.get("GlbCustomFolderProfileKeys");
					var profile = this.Ext.isEmpty(customFolderProfileKeys) ?
						null : customFolderProfileKeys.find(key);

					return this.Ext.isEmpty(profile) ? {} : profile;
				},
				glbGetCurrentEntityFolderSchemaName: function() {
					return this.entitySchemaName + "Folder";
				},
				glbGetFoldersSelect: function() {
					var folderSchemaName = this.glbGetCurrentEntityFolderSchemaName();
					var select = Ext.create("Terrasoft.EntitySchemaQuery", {
						rootSchemaName: folderSchemaName
					});
					select.addMacrosColumn(Terrasoft.QueryMacrosType.PRIMARY_COLUMN, "Id");
					return select;
				},
				glbGetBaseProfileKey: function() {
					var currentTabName = this.getActiveViewName();
					var schemaName = this.name;
					return schemaName + "GridSettings" + currentTabName;
				},
				glbIsProfileEmpty: function(profile) {
					return this.Ext.Object.isEmpty(profile) || this.Ext.isEmpty(profile);
				},
				glbSetActiveFolderProfile: function() {
					var folderId = this.get("CurrentFolder") ? this.get("CurrentFolder").value : null;
					var folderProfile = null;
					if (!this.Ext.isEmpty(folderId)) {
						folderProfile = this.glbGetCustomProfileByFolderId(folderId);
					}
					if (this.glbIsProfileEmpty(folderProfile)) {
						folderProfile = this.glbGetProfileByKey(this.glbGetBaseProfileKey());
					}
					if (this.glbIsProfileEmpty(folderProfile) !== true) {
						folderProfile = Terrasoft.ColumnUtilities.updateProfileColumnCaptions({
							profile: folderProfile,
							entityColumns: this.columns
						});
						if (this.get("Profile") !== folderProfile) {
							this.set("Profile", folderProfile);
						}
					}
				},
				glbLoadCustomFolderProfileKeys: function(callback) {
					var folderEsq = this.glbGetFoldersSelect();
					folderEsq.getEntityCollection(function(result) {
						if (result.success) {
							var resultCollection = result.collection;
							var profileKeys = ["profile!" + this.glbGetBaseProfileKey()];
							resultCollection.each(function(item) {
								var itemProfileKey = this.glbGetCustomFolderProfileKey(item.get("Id"));
								profileKeys.push("profile!" + itemProfileKey);
							}, this);

							var customFolderProfileKeys = this.Ext.create("Terrasoft.Collection");
							this.glbLoadAllFoldersProfile(profileKeys, function() {
								for (var i = 0, j = arguments.length; i < j; i++) {
									if (this.glbIsProfileEmpty(arguments[i]) !== true) {
										if (customFolderProfileKeys.contains(arguments[i].key)) {
											window.console.warn("User profile contains duplicates! Duplicate key: " +
												arguments[i].key);
										} else {
											customFolderProfileKeys.add(arguments[i].key, arguments[i]);
										}
										
									}
								}
								this.set("GlbCustomFolderProfileKeys", customFolderProfileKeys);
								Ext.callback(callback, this);
							}, this);
						} else {
							Ext.callback(callback, this);
						}
					}, this);
				},
				glbGetCustomFolderProfileKey: function(folderId) {
					var baseProfileKey = this.glbGetBaseProfileKey();
					return baseProfileKey + folderId;
				},
				glbLoadAllFoldersProfile: function(customFolderProfileKeys, callback, scope) {
					Terrasoft.require(customFolderProfileKeys, callback, scope);
				},
				/**
				 * @inheritdoc Terrasoft.BaseSectionV2#getActiveViewGridSettingsProfile
				 * @overridden
				 */
				getActiveViewGridSettingsProfile: function(callback, scope) {
					var currentTabName = this.getActiveViewName();
					if (currentTabName === this.get("AnalyticsDataViewName")) {
						this.callParent(arguments);
					}
					this.requireProfile(function(profile) {
						if (this.glbIsProfileEmpty(profile)) {
							profile = this.glbGetProfileByKey(this.glbGetBaseProfileKey());
						}
						
						if (this.glbIsProfileEmpty(profile) !== true) {
							profile = Terrasoft.ColumnUtilities.updateProfileColumnCaptions({
								profile: profile,
								entityColumns: this.columns
							});
						}
						this.set("Profile", profile);
						this.set("GridSettingsChanged", true);
						Ext.callback(callback, scope);
					}, this);
				}
			}
		};
	});