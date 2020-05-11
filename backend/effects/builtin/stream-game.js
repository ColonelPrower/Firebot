"use strict";

const { ControlKind, InputEvent } = require('../../interactive/constants/MixplayConstants');
const effectModels = require("../models/effectModels");
const { EffectTrigger } = effectModels;

const { EffectCategory } = require('../../../shared/effect-constants');

const chat = require("../../common/mixer-chat");

const model = {
    definition: {
        id: "firebot:streamgame",
        name: "Set Stream Game",
        description: "Set the stream game.",
        icon: "fad fa-gamepad",
        categories: [EffectCategory.COMMON],
        dependencies: [],
        triggers: effectModels.buildEffectTriggersObject(
            [ControlKind.BUTTON, ControlKind.TEXTBOX],
            [InputEvent.MOUSEDOWN, InputEvent.KEYDOWN, InputEvent.SUBMIT],
            EffectTrigger.ALL
        )
    },
    optionsTemplate: `
        <eos-container header="Mode">
            <div class="controls-fb" style="padding-bottom: 5px;">
                <label class="control-fb control--radio">Set specific game  <tooltip text="'Search for a specific game to set.'"></tooltip>
                    <input type="radio" ng-model="effect.mode" value="specific"/>
                    <div class="control__indicator"></div>
                </label>
                <label class="control-fb control--radio">Custom game <tooltip text="'Input any name and Firebot will set the closest game it finds when effect is ran (useful with replace variables).'"></tooltip>
                    <input type="radio" ng-model="effect.mode" value="custom"/>
                    <div class="control__indicator"></div>
                </label>
            </div>
        </eos-container>

        <eos-container header="Specific Game" pad-top="true" ng-if="effect.mode === 'specific'" >

            <ui-select ng-model="selectedGame" theme="bootstrap" spinner-enabled="true" on-select="gameSelected($item)" style="margin-bottom:10px;">
                <ui-select-match placeholder="Search for game">
                    <div style="height: 21px; display:flex; flex-direction: row; align-items: center;">
                        <img style="height: 21px; width: 21px; border-radius: 5px; margin-right:5px;" ng-src="{{$select.selected.coverUrl}}">
                        <div style="font-weight: 100;font-size: 17px;">{{$select.selected.name}}</div>
                    </div>
                </ui-select-match>
                <ui-select-choices minimum-input-length="1" repeat="game in games | filter: $select.search" refresh="searchGames($select.search)" refresh-delay="400" style="position:relative;">
                    <div style="height: 35px; display:flex; flex-direction: row; align-items: center;">
                        <img style="height: 30px; width: 30px; border-radius: 5px; margin-right:10px;" ng-src="{{game.coverUrl}}">
                        <div style="font-weight: 100;font-size: 17px;">{{game.name}}</div>
                    </div>                                  
                </ui-select-choices>
            </ui-select>

        </eos-container>

        <eos-container header="Custom Game" pad-top="true" ng-if="effect.mode === 'custom'">
            <input ng-model="effect.gameName" class="form-control" type="text" placeholder="Enter game name" replace-variables>
        </eos-container>
    `,
    optionsController: ($scope, $http) => {
        if ($scope.effect.mode == null) {
            $scope.effect.mode = "specific";
        }
        $scope.games = [];
        $scope.searchGames = function(gameQuery) {
            return $http.get('https://mixer.com/api/v1/types', {
                params: {
                    query: gameQuery
                }
            }).then(function(response) {
                $scope.games = response.data;
            });
        };

        if ($scope.effect.mode === "specific" && $scope.effect.gameId != null) {
            $http.get(`https://mixer.com/api/v1/types/${$scope.effect.gameId}`)
                .then(function(response) {
                    $scope.selectedGame = response.data;
                });
        }

        $scope.gameSelected = function(game) {
            if (game != null) {
                $scope.effect.gameId = game.id;
            }
        };
    },
    optionsValidator: effect => {
        let errors = [];
        if (effect.mode === "specific" && (effect.gameId == null || effect.gameId === "")) {
            errors.push("Please search for and select a game.");
        } else if (effect.mode === "custom" && effect.gameName == null) {
            errors.push("Please input a title for a game.");
        }
        return errors;
    },
    onTriggerEvent: async event => {
        if (event.effect.mode === "specific") {
            chat.updateStreamGameById(event.effect.gameId);
        } else {
            chat.updateStreamGame(event.effect.gameName);
        }
        return true;
    }
};

module.exports = model;
