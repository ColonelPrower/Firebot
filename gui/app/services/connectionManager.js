"use strict";

(function() {
  // Provides utility methods for connecting to mixer services

  angular
    .module("firebotApp")
    .factory("connectionManager", function(
      connectionService,
      listenerService,
      settingsService,
      websocketService,
      soundService,
      boardService,
      utilityService,
      integrationService,
      logger
    ) {
      let service = {};

      // listen for toggle service requests from the backend
      listenerService.registerListener(
        { type: listenerService.ListenerType.TOGGLE_SERVICES_REQUEST },
        services => {
          if (service.isWaitingForServicesStatusChange()) return;
          let shouldConnect = service.connectedServiceCount(services) === 0;
          service.toggleConnectionForServices(services, shouldConnect);
        }
      );

      service.isWaitingForServicesStatusChange = function() {
        return (
          connectionService.waitingForStatusChange ||
          connectionService.waitingForChatStatusChange ||
          connectionService.waitingForConstellationStatusChange ||
          connectionService.isConnectingAll
        );
      };

      service.setConnectionToChat = function(shouldConnect) {
        return new Promise(resolve => {
          listenerService.registerListener(
            {
              type: listenerService.ListenerType.CHAT_CONNECTION_STATUS,
              runOnce: true
            },
            isChatConnected => {
              resolve(isChatConnected);
            }
          );

          if (shouldConnect) {
            connectionService.connectToChat();
          } else {
            connectionService.disconnectFromChat();
          }
        });
      };

      service.setConnectionToConstellation = function(shouldConnect) {
        return new Promise(resolve => {
          listenerService.registerListener(
            {
              type:
                listenerService.ListenerType.CONSTELLATION_CONNECTION_STATUS,
              runOnce: true
            },
            isConstellationConnected => {
              resolve(isConstellationConnected);
            }
          );

          if (shouldConnect) {
            connectionService.connectToConstellation();
          } else {
            connectionService.disconnectFromConstellation();
          }
        });
      };

      service.setConnectionToInteractive = function(shouldConnect) {
        return new Promise(resolve => {
          if (!boardService.hasBoardsLoaded()) {
            utilityService.showInfoModal(
              "Interactive will not connect as you do not have any boards loaded. If you do not plan to use Interactive right now, you can disable it's use by the sidebar connection button via the Connection Panel."
            );
            resolve(false);
            return;
          }

          listenerService.registerListener(
            {
              type: listenerService.ListenerType.CONNECTION_STATUS,
              runOnce: true
            },
            isInteractiveConnected => {
              resolve(isInteractiveConnected);
            }
          );

          if (shouldConnect) {
            connectionService.connectToInteractive();
          } else {
            connectionService.disconnectFromInteractive();
          }
        });
      };

      service.connectedServiceCount = function(services) {
        if (services == null) {
          services = settingsService.getSidebarControlledServices();
        }

        let count = 0;

        services.forEach(s => {
          switch (s) {
            case "interactive":
              if (connectionService.connectedToInteractive) {
                count++;
              }
              break;
            case "chat":
              if (connectionService.connectedToChat) {
                count++;
              }
              break;
            case "constellation":
              if (connectionService.connectedToConstellation) {
                count++;
              }
              break;
            default:
              if (s.startsWith("integration.")) {
                let intId = s.replace("integration.", "");
                if (integrationService.integrationIsConnected(intId)) {
                  count++;
                }
              }
          }
        });

        return count;
      };

      service.partialServicesConnected = function() {
        let services = settingsService.getSidebarControlledServices();
        let connectedCount = service.connectedServiceCount();

        return connectedCount > 0 && services.length > connectedCount;
      };

      service.allServicesConnected = function() {
        let services = settingsService.getSidebarControlledServices();
        let connectedCount = service.connectedServiceCount();

        return services.length === connectedCount;
      };

      service.toggleSidebarServices = function() {
        let services = settingsService.getSidebarControlledServices();

        // we only want to connect if none of the connections are currently connected
        // otherwise we will attempt to disconnect everything.
        let shouldConnect = service.connectedServiceCount() === 0;

        service.toggleConnectionForServices(services, shouldConnect);
      };

      service.toggleConnectionForServices = async function(
        services,
        shouldConnect = false
      ) {
        if (service.isWaitingForServicesStatusChange()) return;

        // Clear all reconnect timeouts if any are running.
        ipcRenderer.send("clearReconnect", "All");

        connectionService.isConnectingAll = true;

        console.log(services);
        for (let i = 0; i < services.length; i++) {
          let s = services[i];
          switch (s) {
            case "interactive":
              if (shouldConnect) {
                await service.setConnectionToInteractive(true);
              } else if (connectionService.connectedToInteractive) {
                await service.setConnectionToInteractive(false);
              }
              break;
            case "chat":
              if (shouldConnect) {
                await service.setConnectionToChat(true);
              } else if (connectionService.connectedToChat) {
                await service.setConnectionToChat(false);
              }
              break;
            case "constellation":
              if (shouldConnect) {
                await service.setConnectionToConstellation(true);
              } else if (connectionService.connectedToConstellation) {
                await service.setConnectionToConstellation(false);
              }
              break;
            default:
              console.log(s);
              if (s.startsWith("integration.")) {
                let intId = s.replace("integration.", "");
                logger.info("connecting " + intId);
                if (integrationService.integrationIsLinked(intId)) {
                  if (shouldConnect) {
                    await integrationService.setConnectionForIntegration(
                      intId,
                      true
                    );
                  } else if (integrationService.integrationIsConnected(intId)) {
                    await integrationService.setConnectionForIntegration(
                      intId,
                      false
                    );
                  }
                }
              }
          }
        }
        connectionService.isConnectingAll = false;

        let soundType =
          service.connectedServiceCount() > 0 ? "Online" : "Offline";
        soundService.connectSound(soundType);
      };

      service.getConnectionStatusForService = function(service) {
        let connectionStatus = null;
        switch (service) {
          case "interactive":
            if (connectionService.connectedToInteractive) {
              connectionStatus = "connected";
            } else {
              connectionStatus = "disconnected";
            }
            break;
          case "chat":
            if (connectionService.connectedToChat) {
              connectionStatus = "connected";
            } else {
              connectionStatus = "disconnected";
            }
            break;
          case "constellation":
            if (connectionService.connectedToConstellation) {
              connectionStatus = "connected";
            } else {
              connectionStatus = "disconnected";
            }
            break;
          case "overlay": {
            logger.info("getting sync event");
            let overlayStatus = listenerService.fireEventSync(
              "getOverlayStatus"
            );

            if (!overlayStatus.serverStarted) {
              connectionStatus = "disconnected";
            } else if (overlayStatus.clientsConnected) {
              connectionStatus = "connected";
            } else {
              connectionStatus = "warning";
            }

            logger.info("here");
            break;
          }
          case "integrations": {
            let sidebarControlledIntegrations = settingsService
              .getSidebarControlledServices()
              .filter(s => s.startsWith("integration."))
              .map(s => s.replace("integration.", ""));

            let connectedCount = 0;
            sidebarControlledIntegrations.forEach(i => {
              if (integrationService.integrationIsConnected(i)) {
                connectedCount++;
              }
            });

            console.log("INT CNT:");
            console.log(sidebarControlledIntegrations);

            console.log(connectedCount);

            if (connectedCount === 0) {
              connectionStatus = "disconnected";
            } else if (
              connectedCount === sidebarControlledIntegrations.length
            ) {
              connectionStatus = "connected";
            } else {
              connectionStatus = "warning";
            }
            break;
          }
          default:
            console.log("SERVICE:");
            console.log(service);
            connectionStatus = "disconnected";
        }
        return connectionStatus;
      };

      return service;
    });
})(window.angular);
