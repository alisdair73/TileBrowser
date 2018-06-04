sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter'
], function(Controller,JSONModel,Filter) {
	"use strict";

	return Controller.extend("TileBrowserTileBrowser.controller.TileView", {

		onInit:function(){
			this.getView().setModel(
				new JSONModel({
					"TileName":"",
					"TargetName":""
				}),"CatalogFilter");
			this.getView().setModel(new JSONModel([]).setDefaultBindingMode(sap.ui.model.BindingMode.OneWay),"Catalog");

			//sap.ui.core.UIComponent.getRouterFor(this).getRoute("RoleSelection").attachPatternMatched(this._onRouteMatched, this);
		},
		
		onSearch:function(event){

			var tileName = this.getView().getModel("CatalogFilter").getProperty("/TileName");
			var targetName = this.getView().getModel("CatalogFilter").getProperty("/TargetName");
			
			var statementGroup = "match (r:Role)-->(g:Group)-->(t:Tile)<--(a:Action)-->(m:TargetMap) " +
			            "where t.name =~ '.*" + tileName + ".*' and m.`Transaction Code` =~ '.*" + targetName + ".*' " +
						"return distinct r,g,t,m,a";  
						
			var statementCatalog = "match (r:Role)-->(c:Catalog)-->(t:Tile)<--(a:Action)-->(m:TargetMap) " +
			            "where t.name =~ '.*" + tileName + ".*' and m.`Transaction Code` =~ '.*" + targetName + ".*' " +
						"return distinct r,c,t,m,a";
			
			this._queryNeo4j(
				{"statements":[{"statement":statementGroup},{"statement":statementCatalog}]},
				this._buildCatalogTable.bind(this)
			);
			
		},
		
		onIconTabBarSelect: function (oEvent) {
			var oBinding = this.getView().byId("tableOfData").getBinding("items");
			
			var key = oEvent.getParameter("key");
			var aFilters = [];

			if (key === "All") {

			} else if (key === "Group") {
				aFilters.push(new Filter("Type", "EQ", "GROUP"));
			} else if (key === "Catalog") {
				aFilters.push(new Filter("Type", "EQ", "CATALOG"));
			}
			oBinding.filter(aFilters);
		},
		
		_buildCatalogTable: function(neo4jResults){
		
			if(neo4jResults.results.length === 0){
				this.getView().getModel("Catalog").setProperty("/",[]);
				return;
			}
			
			var catalogs = [];
			neo4jResults.results[0].data.forEach(function(match){
				
				var target = "";
				switch (match.row[3]["Application Type"]) {
					case "WDA":
						target = match.row[3]["WDA Application"];
						break;
					case "TR":
						target = match.row[3]["Transaction Code"];
						break;
					case "SAPUI5":
						target = match.row[3]["UI5 Component"];
						break;
				}
				
				//Add Role
				catalogs.push({
					"Role":match.row[0].name,
					"Type":"GROUP",
					"GroupOrCatalogName":match.row[1].name,
					"GroupOrCatalogId":match.row[1].nodeId,
					"Tile":match.row[2].name,		
					"Target":target,
					"Navigation":match.row[4].nodeId
				});
			});
			
			neo4jResults.results[1].data.forEach(function(match){
				
				var target = "";
				switch (match.row[3]["Application Type"]) {
					case "WDA":
						target = match.row[3]["WDA Application"];
						break;
					case "TR":
						target = match.row[3]["Transaction Code"];
						break;
					case "SAPUI5":
						target = match.row[3]["UI5 Component"];
						break;
				}
				
				//Add Role
				catalogs.push({
					"Role":match.row[0].name,
					"Type":"CATALOG",
					"GroupOrCatalogName":match.row[1].name,
					"GroupOrCatalogId":match.row[1].nodeId,
					"Tile":match.row[2].name,		
					"Target":target,
					"Navigation":match.row[4].nodeId
				});
			});
			
			catalogs.sort(function(a,b){
			
				if (a.Role < b.Role) return -1;
				if (a.Role > b.Role) return 1;
				if (a.Type < b.Type) return -1;
				if (a.Type > b.Type) return 1;
				if (a.GroupOrCatalogName < b.GroupOrCatalogName) return -1;
				if (a.GroupOrCatalogName > b.GroupOrCatalogName) return 1;
				if (a.Tile < b.Tile) return -1;
				if (a.Tile > b.Tile) return 1;
				return 0;
			});
			this.getView().getModel("Catalog").setSizeLimit(catalogs.length);
			this.getView().getModel("Catalog").setProperty("/",catalogs);
		},
		
		_queryNeo4j:function(statements,success){
			
			var neo4jURL = "http://localhost:7474/db/data/transaction/commit";
			
			$.ajax({
    			type: 'POST',
    			url: neo4jURL,
    			data: JSON.stringify(statements),
    			contentType : "application/json",
                dataType : "json",
				async: false,
				beforeSend: 
					function (request){
            			request.setRequestHeader("Authorization", "Basic " + btoa("neo4j:Clojure31!"));
        			}
			}).done(success).fail(
				function(err) {
			    	if (err !== undefined) {
			    		var oErrorResponse = $.parseJSON(err.responseText);
			    		sap.m.MessageToast.show(oErrorResponse.message, {
			        		duration: 6000
			    		});
			    	} else {
			    		sap.m.MessageToast.show("Unknown error!");
			    	}
				}
			);
		}
		
	});
});