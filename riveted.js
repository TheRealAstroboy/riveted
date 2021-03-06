/*!
 * @preserve
 * riveted.js | v0.6.3
 * Copyright (c) 2016 Rob Flaherty (@robflaherty)
 * 29/10/2020  - gtag Fix by TheRealAstroboy
 * 30/10/2020  - OnePage Support by TheRealAstroboy
 * Licensed under the MIT license
 */

/* Universal module definition */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.riveted = factory();
  }
}(this, function () {

  /* Event values */
  var eventValues = {
    eventCategory: 'Riveted', // default value : 'Riveted'
    eventActionTimeSpent: 'Time Spent', // default value : 'Time Spent'
    timing: 'RivetedTiming', // default value : 'RivetedTiming'
    timingCategory: 'Riveted', // default value : 'Riveted'
    timingVar: 'First Interaction' // default value : 'First Interaction'
  }
  /* Riveted */

var riveted = (function() {

  var started = false,
    stopped = false,
    turnedOff = false,
    clockTime = 0,
    startTime = new Date(),
    clockTimer = null,
    idleTimer = null,
    sendEvent,
    sendUserTiming,
    reportInterval,
    idleTimeout,
    nonInteraction,
    universalGA,
    classicGA,
    universalSendCommand,
    googleTagManager,
    gaGlobal,
    domcontext;

    function init(options) {
      // Set up options and defaults
      options = options || {};
      reportInterval = parseInt(options.reportInterval, 10) || 5;
      idleTimeout = parseInt(options.idleTimeout, 10) || 30;
      gaGlobal = options.gaGlobal || 'ga';
      domcontext = options.domcontext || 'document'
      /*
       * Determine which version of GA is being used
       * "ga", "_gaq", and "dataLayer" are the possible globals
       */

      if (typeof window[gaGlobal] === "function") {
        universalGA = true;
      }

      if (typeof _gaq !== "undefined" && typeof _gaq.push === "function") {
        classicGA = true;
      }

      if (typeof dataLayer !== "undefined" && typeof dataLayer.push === "function") {
        googleTagManager = true;
      }

      if ('gaTracker' in options && typeof options.gaTracker === 'string') {
        universalSendCommand = options.gaTracker + '.send';
      } else {
        universalSendCommand = 'send';
      }

      if (typeof options.eventHandler == 'function') {
        sendEvent = options.eventHandler;
      }

      if (typeof options.userTimingHandler == 'function') {
        sendUserTiming = options.userTimingHandler;
      }

      if ('nonInteraction' in options && (options.nonInteraction === false || options.nonInteraction === 'false')) {
        nonInteraction = false;
      } else {
        nonInteraction = true;
      }

      // Basic activity event listeners
      addListener(document, 'keydown', trigger);
      addListener(document, 'click', trigger);
      addListener(window, 'mousemove', throttle(trigger, 500));
      addListener(window, 'scroll', throttle(trigger, 500));

      // Page visibility listeners
      addListener(document, 'visibilitychange', visibilityChange);
      addListener(document, 'webkitvisibilitychange', visibilityChange);
    }


    /*
     * Throttle function borrowed from:
     * Underscore.js 1.5.2
     * http://underscorejs.org
     * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     * Underscore may be freely distributed under the MIT license.
     */

    function throttle(func, wait) {
      var context, args, result;
      var timeout = null;
      var previous = 0;
      var later = function() {
        previous = new Date;
        timeout = null;
        result = func.apply(context, args);
      };
      return function() {
        var now = new Date;
        if (!previous) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
          clearTimeout(timeout);
          timeout = null;
          previous = now;
          result = func.apply(context, args);
        } else if (!timeout) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    }

    /*
     * Cross-browser event listening
     */

    function addListener(element, eventName, handler) {
      if (element.addEventListener) {
        element.addEventListener(eventName, handler, false);
      }
      else if (element.attachEvent) {
        element.attachEvent('on' + eventName, handler);
      }
      else {
        element['on' + eventName] = handler;
      }
    }

    function gtag(){dataLayer.push(arguments);}  
  
    /*
     * Function for logging User Timing event on initial interaction
     */

    sendUserTiming = function (timingValue) {

      if (googleTagManager) {
        gtag('event', eventValues.timing, {
          'event_category': eventValues.timingCategory,
          'event_label': domcontext + '-' + eventValues.timingVar,
          'value': timingValue
        });

      } else {

        if (universalGA) {
          window[gaGlobal](universalSendCommand, 'timing', eventValues.timingCategory, domcontext + '-' + eventValues.timingVar, timingValue);
        }

        if (classicGA) {
          _gaq.push(['_trackTiming', eventValues.timingCategory, domcontext + '-' + eventValues.timingVar, timingValue, null, 100]);
        }

      }

    };

    /*
     * Function for logging ping events
     */

    sendEvent = function (time) {
      if (googleTagManager) {

        gtag('event', eventValues.eventActionTimeSpent, {
          'event_category': eventValues.eventCategory,
          'event_label': domcontext, 
          'value': reportInterval,
          'non_interaction': nonInteraction
        });

      } else {

        if (universalGA) {
          window[gaGlobal](universalSendCommand, 'event', eventValues.eventCategory, eventValues.eventActionTimeSpent, domcontext, reportInterval, { 'nonInteraction': nonInteraction });
        }

        if (classicGA) {
          _gaq.push(['_trackEvent', eventValues.eventCategory, eventValues.eventActionTimeSpent, domcontext, reportInterval, nonInteraction]);
        }

      }

    };

    function setIdle() {
      clearTimeout(idleTimer);
      stopClock();
    }

    function visibilityChange() {
      if (document.hidden || document.webkitHidden) {
        setIdle();
      }
    }

    function clock() {
      clockTime += 1;
      if (clockTime > 0 && (clockTime % reportInterval === 0)) {
        sendEvent(clockTime);
      }

    }

    function stopClock() {
      stopped = true;
      clearInterval(clockTimer);
    }

    function turnOff() {
      setIdle();
      turnedOff = true;
    }

    function turnOn() {
      turnedOff = false;
    }

    function restartClock() {
      stopped = false;
      clearInterval(clockTimer);
      clockTimer = setInterval(clock, 1000);
    }

    function startRiveted() {

      // Calculate seconds from start to first interaction
      var currentTime = new Date();
      var diff = currentTime - startTime;

      // Set global
      started = true;

      // Send User Timing Event
      sendUserTiming(diff);

      // Start clock
      clockTimer = setInterval(clock, 1000);

    }

    function resetRiveted() {
      startTime = new Date();
      clockTime = 0;
      started = false;
      stopped = false;
      clearInterval(clockTimer);
      clearTimeout(idleTimer);
    }

    function trigger() {

      if (turnedOff) {
        return;
      }

      if (!started) {
        startRiveted();
      }

      if (stopped) {
        restartClock();
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(setIdle, idleTimeout * 1000 + 100);
    }

    return {
      init: init,
      trigger: trigger,
      setIdle: setIdle,
      on: turnOn,
      off: turnOff,
      reset: resetRiveted
    };

  })();

  return riveted;

}));
