'use strict';
(function($) {

    // This handles the Events tab
    const EventType = require('../../lib/live-events/EventType.js');

    angular
        .module('firebotApp')
        .controller('eventsController', function($scope, eventsService, utilityService) {
            $scope.eventsService = eventsService;
            /*
             * On tab load
             */
            eventsService.loadEvents();

            /*
             * ADD/EDIT EVENT MODAL
             */
            $scope.showAddEditEventModal = function(eventToEdit) {
                let addEditEventsModalContext = {
                    templateUrl: "addEditEventModal.html",
                    // This is the controller to be used for the modal.
                    controllerFunc: ($scope, $uibModalInstance, utilityService, eventToEdit) => {
                        $scope.eventTypes = EventType.getAllEventTypes();

                        // The model for the board id text field
                        $scope.event = {
                            eventName: ""
                        };

                        $scope.isNewEvent = eventToEdit == null;

                        if (!$scope.isNewEvent) {
                            $scope.event = $.extend(true, {}, eventToEdit);
                        }

                        $scope.eventClick = function(event) {
                            $scope.event['eventType'] = event;
                        }

                        $scope.effectListUpdated = function(effects) {
                            $scope.event['effects'] = effects;
                        };

                        // When the user clicks "Save/Add", we want to pass the event back
                        $scope.saveChanges = function(shouldDelete) {
                            shouldDelete = shouldDelete === true;

                            let eventName = $scope.event.eventName;

                            if (!shouldDelete && eventName === "") return;
                            $uibModalInstance.close({
                                shouldDelete: shouldDelete,
                                event: shouldDelete ? eventToEdit : $scope.event
                            });
                        };

                        // When they hit cancel or click outside the modal, we dont want to do anything
                        $scope.dismiss = function() {
                            $uibModalInstance.dismiss();
                        };
                    },
                    resolveObj: {
                        eventToEdit: () => {
                            if (eventToEdit != null) {
                                return $.extend(true, {}, eventToEdit);
                            }
                            return null;

                        }
                    },
                    // The callback to run after the modal closed via "Save changes" or "Delete"
                    closeCallback: (context) => {
                        let event = context.event;
                        if (context.shouldDelete === true) {
                            eventsService.removeEvent(event.eventName);
                        } else {
                            let previousEventName = null;
                            if (eventToEdit != null) {
                                previousEventName = eventToEdit.eventName;
                            }
                            eventsService.addOrUpdateEvent(event, previousEventName);
                        }
                    }
                };
                utilityService.showModal(addEditEventsModalContext);
            };

        });
}(window.jQuery));