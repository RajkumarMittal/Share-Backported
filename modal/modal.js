/* global browser, URL, document, console */

/* Autoresize the modal based on rows */
function resize_modal() {
  var shares = document.querySelectorAll('.share').length;
  var row = 0;
  var column = 4; // Set 4 (columns) default
  if (shares < 4) column = shares; // If visible services are smaller than 4
  if(shares == 0)
  {
    // If all of services are hidden, it shows a message
    document.getElementsByTagName("body")[0].innerHTML="<span id='error_msg'>All services are hidden</span>";
    column = 3;
  }
  var width_modal = column * 76;
  document.getElementsByTagName("html")[0].style.width = width_modal+"px";
  document.getElementsByTagName("body")[0].style.width = width_modal+"px";
  // Set the height of the modal
  row = Math.ceil(shares / column);
  document.querySelector('html').classList.add('lines-' + row);
  document.querySelector('body').classList.add('lines-' + row);
}

/* Open popup with sizes */
function open_popup(newurl, width, height) {
  if (Number.isNaN(width)) {
    width = 700;
  }
  if (Number.isNaN(height)) {
    height = 340;
  }
  browser.runtime.sendMessage({
    type: 'share-backid',
    data: {
      url: newurl,
      width: width,
      height: height,
      type: 'popup'
    }
  });
}

/* DO you want to open the url in a container? */
function open_container_tab(newurl, cookieStoreId) {
  browser.runtime.sendMessage({
    type: 'share-backid-container',
    data: {
      url: newurl,
      cookieStoreId
    }
  });
}

/* Support for Facebook Container extension */
function checkFacebookContainerExtension() {
  const extensionId = '@contain-facebook';
  const facebookContainerName = 'Facebook';
  return new Promise(function(resolve) {
    browser.management.get(extensionId).then(addon => {
      if (!addon.enabled) {
        resolve(null);
      }
      return browser.contextualIdentities.query({name: facebookContainerName});
    }).then(contexts => {
      if (contexts.length > 0) {
        resolve(contexts[0].cookieStoreId);
      } else {
        resolve(null);
      }
    }).catch(e => {
      resolve(null);
    });
  });
}

/* Support for Container feature of Firefox */
function checkContainerAssignment(url) {
  const extensionId = '@testpilot-containers';
  return new Promise(resolve => {
    browser.management.get(extensionId).then(addon => {
      if (!addon.enabled) {
        resolve(null);
      }
      return browser.runtime.sendMessage(extensionId, {
        method: "getAssignment",
        url
      });
    }).then(resolve).catch(e => {
      resolve(null);
    });
  });
}

/* Add events on the share window tothe various button */
document.addEventListener('DOMContentLoaded', () => {
  var width = 700;
  var height = 340;
  const buttons = Array.from(document.querySelectorAll('.share'));

  var promisedButtons = Promise.all(
    buttons.map(function(button) {
      var item = button.getAttribute('id');
      var getting = browser.storage.local.get(item);
      return getting
        .then(function(result) {
          var key = Object.keys(result)[0];

          removeUncheckedButtons(result, key, item);
          button.addEventListener('click', function(event) {
            onClick(event, this);
          }, false);
          resize_modal();
          return button;
        }, function(error) {
          console.log(`Error: ${error}`);
        });
    })
  )

  promisedButtons.then(function(buttons) {
    var buttonsWithPriority = Promise.all(
      buttons.map(function (button) {
        var item = button.getAttribute('id');
        var priorityKey = item + '-priority';

        return browser.storage.local
          .get(priorityKey)
          .then(function(result) {
            var priority, shareButton;

            if (priorityKey in result) {
              priority = parseInt(result[priorityKey], 10);
              shareButton = document.getElementById(item);
              if (shareButton) {
                return {
                  el: shareButton,
                  priority: priority
                };
              }
            }
            return {
              el: null,
              priority: priority
            };
          });
      })
    )

    buttonsWithPriority.then(function(pairs) {
      var grid = document.getElementById('share-directory-grid');
      pairs
        .filter(function(pair) {
          // Filter for null
          return Boolean(pair.el);
        })
        .sort(function(a, b) {
          // Sort descending
          var order = b.priority - a.priority;
          if (order < 0) { return -1; }
          if (order > 0) { return  1; }
          return 0;
        })
        .reduce(function(before, current) {
          grid.insertBefore(current.el, before.el);
          return current;
        });
    });
  });
});

function removeUncheckedButtons(result, key, item) {
  if (!result[key] && document.querySelector('#' + item + ':not(.customurl)') !== null) {
    document.querySelector('#' + item).remove();
    resize_modal();
    return;
  }

  // Simple trick to check custom share that doesn't have a boolean value
  if (typeof result[key] !== "undefined" && result[key].length > 6) {
    document.querySelector('#' + item + '.customurl').dataset.share = result[key];
  } else {
    if (document.querySelector('#' + item + '.customurl') !== null) {
      document.querySelector('#' + item + '.customurl').remove();
      resize_modal();
      return;
    }
  }
}

function onClick(event, item) {
  event.preventDefault();

  var urlshare = item.dataset.share;
  if (item === 'wayback') {
    urlshare = 'https://web.archive.org/save/';
  }

  const url = new URL(urlshare);
  browser.tabs.query(
    { active: true, windowId: browser.windows.WINDOW_ID_CURRENT },
    tabs => {
      var newUrl;
      var tab = tabs[0];
      var tabTitle = tab.title;
      var url_encoded = encodeURI(tab.url);

      // TODO: Replace with switch-case;
      if (url.searchParams.has('u')) {
        url.searchParams.set('u', url_encoded);
      } else if (url.searchParams.has('url')) {
        url.searchParams.set('url', url_encoded);
      } else if (url.searchParams.has('link')) {
        url.searchParams.set('link', url_encoded);
      } else if (url.searchParams.has('canonicalUrl')) {
        url.searchParams.set('canonicalUrl', url_encoded);
      } else if (url.searchParams.has('body')) {
        url.searchParams.set('body', url_encoded);
      } else if (url.searchParams.has('post')) {
        url.searchParams.set('post', url_encoded);
      }

      // TODO: Replace with switch-case;
      if (url.searchParams.has('text')) {
        url.searchParams.set('text', tabTitle);
      } else if (url.searchParams.has('title')) {
        url.searchParams.set('title', tabTitle);
      } else if (url.searchParams.has('su')) {
        url.searchParams.set('su', tabTitle);
      } else if (url.searchParams.has('description')) {
        url.searchParams.set('description', tabTitle);
      } else if (url.searchParams.has('subject')) {
        url.searchParams.set('subject', tabTitle);
      }

      newUrl = url.toString();

      if (item === 'diaspora') {
        newUrl = url.toString();
        newUrl = newUrl.replace(/\+/gi, ' ');
      }

      if (item === 'mastodon' || item === 'whatsapp') {
        url.searchParams.set('text', tabTitle + ' - ' + url_encoded);
        newUrl = url.toString();
      }

      if (item === 'wayback') {
        newUrl = url.toString() + url_encoded;
      }

      Promise.all([
        checkContainerAssignment(newUrl),
        checkFacebookContainerExtension()
      ])
        .then(([assignment, facebookCookieStoreId]) => {
          if (assignment) {
            const cookieStoreId = 'firefox-container-' + assignment.userContextId;
            open_container_tab(newUrl, cookieStoreId);
          } else if (item.id === 'facebook' && facebookCookieStoreId !== null) {
            open_container_tab(newUrl, facebookCookieStoreId);
          } else {
            browser.storage.local
              .get([item.id + "-width", item.id + "-height"])
              .then(function(items) {
                width = parseInt(items[item.id + "-width"]);
                height = parseInt(items[item.id + "-height"]);
                open_popup(newUrl, width, height);
              },
                function(error) {
                  open_popup(newUrl, width, height);
                });
          }
        });
    });
}
