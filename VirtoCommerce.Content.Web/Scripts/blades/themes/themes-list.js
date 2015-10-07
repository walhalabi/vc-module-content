﻿angular.module('virtoCommerce.contentModule')
.controller('virtoCommerce.contentModule.themesListController', ['$scope', 'virtoCommerce.contentModule.themes', 'virtoCommerce.contentModule.stores', 'platformWebApp.bladeNavigationService', 'platformWebApp.dialogService', function ($scope, themes, themesStores, bladeNavigationService, dialogService) {
	$scope.selectedNodeId = null;

	var blade = $scope.blade;
	blade.choosenTheme = undefined;
	blade.defaultThemeName = undefined;

	blade.initialize = function () {
		blade.isLoading = true;
		themes.get({ storeId: blade.storeId }, function (data) {
		    blade.currentEntities = data;
		    if (data.length > 0) {
		        blade.choosenTheme = blade.currentEntities[0];
		    }
			themesStores.get({ id: blade.storeId }, function (data) {
				blade.store = data;
				if (_.find(blade.store.dynamicProperties, function (property) { return property.name === 'DefaultThemeName'; }) !== undefined) {
				    var defaultThemeNameProperty = _.find(blade.store.dynamicProperties, function (property) { return property.name === 'DefaultThemeName'; });

				    if (defaultThemeNameProperty !== undefined && defaultThemeNameProperty.values !== undefined && defaultThemeNameProperty.values.length > 0) {
				        blade.defaultThemeName = defaultThemeNameProperty.values[0].value;
				    }
				}
				blade.isLoading = false;
			},
            function (error) { bladeNavigationService.setError('Error ' + error.status, $scope.blade); });
		},
        function (error) { bladeNavigationService.setError('Error ' + error.status, $scope.blade); });
	}

	blade.closeChildrenBlades = function() {
		if ($scope.blade.childrenBlades) {
			angular.forEach($scope.blade.childrenBlades.slice(), function (child) {
				bladeNavigationService.closeBlade(child);
			});
		}
	}

	$scope.blade.headIcon = 'fa-archive';

	$scope.blade.toolbarCommands = [
        {
        	name: "Add", icon: 'fa fa-plus',
        	executeMethod: function () {
        		blade.openBladeNew();
        	},
        	canExecuteMethod: function () {
        		return true;
        	},
        	permission: 'content:create'
        },
		{
			name: "Set Active", icon: 'fa fa-pencil-square-o',
			executeMethod: function () {
				blade.setThemeAsActive();
			},
			canExecuteMethod: function () {
				return !angular.isUndefined(blade.choosenTheme) && !blade.isThemeDefault(blade.choosenTheme);
			},
			permission: 'content:update'
		},
		{
			name: "Delete theme", icon: 'fa fa-trash-o',
			executeMethod: function () {
				blade.deleteTheme();
			},
			canExecuteMethod: function () {
				return !angular.isUndefined(blade.choosenTheme);
			},
			permission: 'content:delete'
		},
		{
			name: "Preview theme", icon: 'fa fa-eye',
			executeMethod: function () {
				blade.previewTheme();
			},
			canExecuteMethod: function () {
				return !angular.isUndefined(blade.choosenTheme);
			}
		},
		{
			name: "Edit CSS/HTML", icon: 'fa fa-code',
			executeMethod: function () {
				blade.editTheme();
			},
			canExecuteMethod: function () {
				return !angular.isUndefined(blade.choosenTheme);
			},
			permission: 'content:update'
		}
	];


	blade.deleteTheme = function () {
		var dialog = {
			id: "confirmDelete",
			title: "Delete confirmation",
			callback: function (remove) {
				if (remove) {
					blade.isLoading = true;
					themes.deleteTheme({ storeId: blade.storeId, themeId: blade.choosenTheme.name }, function (data) {
						blade.initialize();
						blade.parentBlade.refresh(blade.storeId, 'defaultTheme');
						blade.closeChildrenBlades();
					},
                    function (error) { bladeNavigationService.setError('Error ' + error.status, $scope.blade); });
				}
			}
		}

		if (blade.currentEntities.length > 1) {
			dialog.message = "Are you sure you want to delete " + blade.choosenTheme.name + "?";
		}
		else {
			dialog.message = "This theme is the last one. If you delete it, you could break your storefront. Are you sure you want to delete " + blade.choosenTheme.name + "?";
		}

		dialogService.showConfirmationDialog(dialog);
	}

	blade.setThemeAsActive = function () {
		blade.isLoading = true;
		if (_.where(blade.store.dynamicProperties, { name: "DefaultThemeName" }).length > 0) {
		    angular.forEach(blade.store.dynamicProperties, function (value, key) {
				if (value.name === "DefaultThemeName") {
				    value.values[0] = { value: blade.choosenTheme.name };
				}
			});
		}

		themesStores.update({ storeId: blade.storeId }, blade.store, function (data) {
			blade.initialize();
			blade.parentBlade.refresh(blade.storeId, 'defaultTheme');

		},
        function (error) { bladeNavigationService.setError('Error ' + error.status, $scope.blade); });
	}

	blade.previewTheme = function () {
		if (blade.store.url !== undefined) {
			window.open(blade.store.url + '?previewtheme=' + blade.choosenTheme.name, '_blank');
		}
		else {
			var dialog = {
				id: "noUrlInStore",
				title: "Url is not set for store",
				message: "Please, set store url, before preview theme!",
				callback: function (remove) {

				}
			}
			dialogService.showNotificationDialog(dialog);
		}
	}

	blade.checkTheme = function (data) {
		blade.choosenTheme = data;
	}

	blade.editTheme = function () {

		var newBlade = {
			id: 'themeAssetListBlade',
			choosenThemeId: blade.choosenTheme.name,
			choosenStoreId: blade.storeId,
			choosenTheme: blade.choosenTheme,
			title: 'Edit ' + blade.choosenTheme.path,
			subtitle: 'Theme asset list',
			controller: 'virtoCommerce.contentModule.themeAssetListController',
			template: 'Modules/$(VirtoCommerce.Content)/Scripts/blades/themes/theme-asset-list.tpl.html',
		};
		bladeNavigationService.showBlade(newBlade, blade);
	}

	blade.createDefaultTheme = function () {
		themes.createDefaultTheme({ storeId: blade.storeId }, function (data) {
			blade.initialize();
			blade.parentBlade.refresh(blade.storeId, 'themes');
		},
        function (error) {
        	bladeNavigationService.setError('Error ' + error.status, $scope.blade);
        });
	}

	blade.themeClass = function (data) {
		var retVal = '';

		if (blade.isThemeSelected(data)) {
			retVal += '__selected ';
		}

		if (blade.isThemeDefault(data)) {
			retVal += '__default';
		}

		return retVal;
	}

	blade.isThemeSelected = function (data) {
		if (blade.choosenTheme !== undefined) {
			if (blade.choosenTheme.name === data.name) {
			return true;
		}
		}
		return false;
	}

	blade.isThemeDefault = function (data) {
		if (blade.defaultThemeName === data.name) {
			return true;
		}
		return false;
	}

	blade.openBladeNew = function () {
		var newBlade = {
			id: 'addTheme',
			choosenStoreId: blade.storeId,
			currentEntity: {},
			title: 'New theme asset',
			subtitle: 'Create new theme',
			controller: 'virtoCommerce.contentModule.addThemeController',
			template: 'Modules/$(VirtoCommerce.Content)/Scripts/blades/themes/add-theme.tpl.html',
		};
		bladeNavigationService.showBlade(newBlade, $scope.blade);
	}

	blade.onClose = function (closeCallback) {
		blade.closeChildrenBlades();
		closeCallback();
	};

	blade.initialize();
}]);
