;(function ( $, window, document, undefined ) {

    var pluginName = "eaStandard",

        defaults = {
            overview_selector: "#ea-appointments-overview",
            overview_template: null,
            initScrollOff: false
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;
        this.$element = jQuery(element);
        this.settings = jQuery.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }

    jQuery.extend(Plugin.prototype, {
        vacation: function(workerId, day) {
            var response = [true, day, ''];

            // block days from shortcode
            if (Array.isArray(ea_settings.block_days) && ea_settings.block_days.includes(day)) {
                return [
                    false,
                    'blocked',
                    ea_settings.block_days_tooltip
                ];
            }

            if (!Array.isArray(ea_vacations) || ea_vacations.length === 0) {
                return response;
            }

            jQuery.each(ea_vacations, function(index, vacation) {
                // Check events
                // Case we have workers selected
                if (vacation.workers.length > 0) {
                    // extract worker ids
                    var workerIds = jQuery.map(vacation.workers, function(worker) {
                        return worker.id;
                    });
                    // selected worker is not in vacation list exit
                    if (jQuery.inArray(workerId, workerIds) === -1) {
                        return true;
                    }

                }

                if (jQuery.inArray(day, vacation.days) === -1) {
                    return true;
                }

                response = [false, 'blocked vacation', vacation.tooltip];

                return false;
            });

            return response;
        },
        /**
         * Plugin init
         */
        init: function () {
            var plugin = this;

            this.settings.overview_template = _.template(jQuery(this.settings.overview_selector).html());

            // close plugin if something is missing
            if (!this.settingsOk()) {
                return;
            }

            this.$element.find('.ea-phone-number-part, .ea-phone-country-code-part').change(function() {
                plugin.parsePhoneField($(this));
            });

            // handle form validation with scroll to field with error
            this.$element.find('form').validate({
                focusInvalid: false,
                invalidHandler: function(form, validator) {
                    if (!validator.numberOfInvalids())
                        return;
                    $('html, body').animate({
                        scrollTop: ($(validator.errorList[0].element).offset().top - 30)
                    }, 1000);
                }
            });

            // select change event
            this.$element.find('select').change(jQuery.proxy( this.getNextOptions, this ));

            jQuery.datepicker.setDefaults( jQuery.datepicker.regional[ea_settings.datepicker] );

            var firstDay = ea_settings.start_of_week;
            var minDate = (ea_settings.min_date === null) ? 0 : ea_settings.min_date;

            // datePicker
            this.$element.find('.date').datepicker({
                onSelect: jQuery.proxy(plugin.dateChange, plugin),
                dateFormat: 'yy-mm-dd',
                minDate: minDate,
                maxDate: ea_settings.max_date,
                firstDay: firstDay,
                defaultDate: ea_settings.default_date,
                showWeek: ea_settings.show_week === '1',
                // add class to every field, so we can later find it
                beforeShowDay: function(date) {
                    var month = date.getMonth() + 1;
                    var days = date.getDate();

                    if(month < 10) {
                        month = '0' + month;
                    }

                    if(days < 10) {
                        days = '0' + days;
                    }

                    var dateString = date.getFullYear() + '-' + month + '-' + days;
                    var workerId = plugin.$element.find('[name="worker"]').val();

                    return plugin.vacation(workerId, dateString);
                }
            });

            // hide options with one choiche
            this.hideDefault();

            // time is selected
            this.$element.find('.time').on('click', '.time-value', function (event) {
                event.preventDefault();

                var result = plugin.selectTimes(jQuery(this));

                plugin.triggerSlotSelectEvent();

                // check if we can select that field
                if (!result) {
                    if (ea_settings['trans.slot-not-selectable'] !== undefined) {
                        alert(ea_settings['trans.slot-not-selectable']);                        
                    }else{
                        alert('Not enough time please choose an earlier slot');
                    }
                    return;
                }

                if (ea_settings['pre.reservation'] === '1') {
                    plugin.appSelected.apply(plugin);
                } else {
                    // for booking overview
                    var booking_data = {};

                    booking_data.location = plugin.$element.find('[name="location"] > option:selected').text();
                    booking_data.service = plugin.$element.find('[name="service"] > option:selected').text();
                    booking_data.worker = plugin.$element.find('[name="worker"] > option:selected').text();
                    booking_data.date = plugin.$element.find('.date').datepicker().val();
                    booking_data.time = plugin.$element.find('.selected-time').data('val');
                    booking_data.price = plugin.$element.find('[name="service"] > option:selected').data('price');

                    var format = ea_settings['date_format'] + ' ' + ea_settings['time_format'];
                    booking_data.date_time = moment(booking_data.date + ' ' + booking_data.time, ea_settings['default_datetime_format']).format(format);

                    // set overview cancel_appointment
                    var overview_content = '';

                    overview_content = plugin.settings.overview_template({data: booking_data, settings: ea_settings});

                    plugin.$element.find('#booking-overview').html(overview_content);

                    plugin.$element.find('#ea-total-amount').on('checkout:done', function( event, checkoutId ) {
                        var paypal_input = plugin.$element.find('#paypal_transaction_id');

                        if (paypal_input.length == 0) {
                            paypal_input = jQuery('<input id="paypal_transaction_id" class="custom-field" name="paypal_transaction_id" type="hidden"/>');
                            plugin.$element.find('.final').append(paypal_input);
                        }

                        paypal_input.val(checkoutId);

                        // make final conformation
                        plugin.singleConformation(event);
                    });

                    // plugin.$element.find('.step').addClass('disabled');
                    plugin.$element.find('.final').removeClass('disabled');
                    plugin.scrollToElement(plugin.$element.find('.final'));
                    plugin.$element.find('#ea-payment-select').show();

                    // trigger global event when time slot is selected
                    jQuery(document).trigger('ea-timeslot:selected');
                }
            });

            // init blur next steps
            this.blurNextSteps(this.$element.find('.step:visible:first'), true);

            if (ea_settings['pre.reservation'] === '1') {
                this.$element.find('.ea-submit').on('click', jQuery.proxy(plugin.finalComformation, plugin));
            } else {
                this.$element.find('.ea-submit').on('click', jQuery.proxy(plugin.singleConformation, plugin));
            }

            this.$element.find('.ea-cancel').on('click', jQuery.proxy(plugin.cancelApp, plugin));

            setTimeout(function() {
                jQuery(document).trigger('ea-init:completed');
            }, 1000);
        },

        selectTimes: function ($element) {
            var plugin = this;

            var serviceData = plugin.$element.find('[name="service"] > option:selected').data();
            var duration = serviceData.duration;
            var slot_step = serviceData.slot_step;

            var takeSlots = parseInt(duration) / parseInt(slot_step);
            var $nextSlots = $element.nextAll();

            var forSelection = [];
            forSelection.push($element);

            if (($nextSlots.length + 1) < takeSlots) {
                return false;
            }

            $element.parent().children().removeClass('selected-time');

            jQuery.each($nextSlots, function (index, elem) {
                var $elem = jQuery(elem);

                var startTime = moment($element.data('val'), 'HH:mm');
                var calculatedTime = (index + 1) * slot_step;
                var expectedTime = startTime.add(calculatedTime, 'minutes').format('HH:mm');

                if ($elem.data('val') !== expectedTime) {
                    return false;
                }

                if (index + 2 > takeSlots) {
                    return false;
                }

                if ($elem.hasClass('time-disabled')) {
                    return false;
                }

                forSelection.push($elem);
            });

            if (forSelection.length < takeSlots) {
                return false;
            }

            jQuery.each(forSelection, function (index, elem) {
                elem.addClass('selected-time');
            });

            return true;
        },

        settingsOk: function () {
            var selectOptions = this.$element.find('select').not('.custom-field');
            var errors = jQuery('<div style="border: 1px solid gray; padding: 20px;">');
            var valid = true;

            selectOptions.each(function(index, element) {
                var $el = jQuery(element);
                var options = $el.children('option');

                // <option value="">-</option>
                if (options.length === 1 && options.attr('value') == '') {
                    jQuery(document.createElement('p'))
                        .html('You need to define at least one <strong>' + $el.attr('name') + '</strong>.')
                        .appendTo(errors);

                    valid = false;
                }
            });

            if (!valid) {
                errors.prepend('<h4>East Appointments - Settings validation:</h4>');
                errors.append('<p>There should be at least one Connection.</p>');

                this.$element.html(errors);
            }

            return valid;
        },
        hideDefault: function () {
            var steps = this.$element.find('.step');
            var count = 0;

            steps.each(function (index, element) {
                var select = jQuery(element).find('select');

                if (select.length < 1) {
                    return;
                }

                var options = select.children('option');

                if (options.length !== 1) {
                    return;
                }

                if (options.value !== '') {
                    jQuery(element).hide();
                    count++;
                }
            });

            if (count === 3) {
                this.settings.initScrollOff = true;
            }
        },
        // get All previus step options
        getPrevousOptions: function (element) {
            var step = element.parents('.step');

            var options = {};

            var data_prev = step.prevAll('.step');

            data_prev.each(function (index, elem) {
                var option = jQuery(elem).find('select,input').first();

                options[jQuery(option).data('c')] = option.val();
            });

            return options;
        },
        /**
         * Get next select option
         */
        getNextOptions: function (event) {
            var current = jQuery(event.target);

            var step = current.parent('.step');

            // blur next options
            this.blurNextSteps(step);

            // nothing selected
            if (current.val() === '') {
                return;
            }

            var options = {};

            options[current.data('c')] = current.val();

            var data_prev = step.prevAll('.step');

            data_prev.each(function (index, elem) {
                var input_field = jQuery(elem).find('.filter').filter('input, select');

                options[jQuery(input_field).data('c')] = input_field.val();
            });

            // hidden
            this.$element.find('.step:hidden').each(function (index, elem) {
                var option = jQuery(elem).find('select,input').first();

                options[jQuery(option).data('c')] = option.val();
            });

            //only visible step
            var nextStep = step.nextAll('.step:visible:first');

            var next = jQuery(nextStep).find('select,input');

            if (next.length === 0) {
                this.blurNextSteps(nextStep);
                //nextStep.removeClass('disabled');
                return;
            }

            options.next = next.data('c');

            this.callServer(options, next);
        },
        /**
         * Standard call for select options (location, service, worker)
         */
        callServer: function (options, next_element) {
            var plugin = this;

            options.action = 'ea_next_step';
            options.check  = ea_settings['check'];
            options._cb    = Math.floor(Math.random() * 1000000);

            this.placeLoader(next_element.parent());

            jQuery.get(ea_ajaxurl, options, function (response) {
                next_element.empty();
                var default_option_value = '-';
                if (options.next == 'service') {
                    default_option_value = 'Select '+ea_settings['trans.service'];
                }
                if (options.next == 'location') {
                    default_option_value = 'Select '+ea_settings['trans.location'];
                }
                if (options.next == 'worker') {
                    default_option_value = 'Select '+ea_settings['trans.worker'];
                }
                // default
                next_element.append('<option value="">'+default_option_value+'</option>');

                // options
                jQuery.each(response, function (index, element) {
                    var name = element.name;
                    var $option = jQuery('<option value="' + element.id + '">' + name + '</option>');

                    if ('price' in element && ea_settings['price.hide'] !== '1') {

                        if (ea_settings['currency.before'] == '1') {
                            $option.text(element.name + ' - ' + next_element.data('currency') + element.price);
                        } else {
                            $option.text(element.name + ' - ' + element.price + next_element.data('currency'));
                        }

                        $option.data('price', element.price);
                    }

                    if ('slot_step' in element) {
                        $option.data('slot_step', element.slot_step);
                        $option.data('duration', element.duration);
                    }

                    next_element.append($option);
                });

                // enabled
                next_element.parent().removeClass('disabled');

                plugin.removeLoader();

                plugin.scrollToElement(next_element.parent());
            }, 'json')
            .error(function(xhr, status) {

                if (xhr.status === 403) {
                    alert(ea_settings['trans.nonce-expired']);
                }

                if (xhr.status === 500) {
                    alert(ea_settings['trans.internal-error']);
                }

                plugin.removeLoader();
            });
        },
        placeLoader: function ($element) {
            var width = $element.width();
            var height = $element.height();
            jQuery('#ea-loader').prependTo($element);
            jQuery('#ea-loader').css({
                'width': width,
                'height': height
            });
            jQuery('#ea-loader').show();
        },
        removeLoader: function () {
            jQuery('#ea-loader').hide();
        },
        getCurrentStatus: function () {
            var options = jQuery(this.element).find('select');
        },
        blurNextSteps: function (current, dontScroll) {
            // check if there is scroll param
            dontScroll = dontScroll || false;

            current.removeClass('disabled');

            var nextSteps = current.nextAll('.step:visible');

            nextSteps.each(function (index, element) {
                jQuery(element).addClass('disabled');
            });

            // if next step is calendar
            if (current.hasClass('calendar')) {

                var calendar = this.$element.find('.date');

                this.$element.find('.ui-datepicker-current-day').click();

                if (!dontScroll) {
                    this.scrollToElement(calendar);
                }
            }
        },
        /**
         * Change of date - datepicker
         */
        dateChange: function (dateString, calendar) {
            var plugin = this;

            calendar = jQuery(calendar.dpDiv).parents('.date');

            calendar.parent().next().addClass('disabled');

            var options = this.getPrevousOptions(calendar);

            options.action = 'ea_date_selected';
            options.date   = dateString;
            options.check  = ea_settings['check'];
            options._cb    = Math.floor(Math.random() * 1000000);

            this.placeLoader(calendar);

            jQuery.get(ea_ajaxurl, options, function (response) {

                var next_element = jQuery(calendar).parent().next('.step').children('.time');

                next_element.empty();

                jQuery.each(response, function (index, element) {
                    var classAMPM = (ea_settings["time_format"] == "am-pm") ? ' am-pm' : '';

                    if (element.count > 0) {

                        // show remaining slots or not
                        if (ea_settings['show_remaining_slots'] === '1') {
                            next_element.append('<a href="#" class="time-value slots' + classAMPM + '" data-val="' + element.value + '">' + element.show + ' (' + element.count + ')</a>');
                        } else {
                            next_element.append('<a href="#" class="time-value' + classAMPM + '" data-val="' + element.value + '">' + element.show + '</a>');
                        }
                    } else {

                        if (ea_settings['show_remaining_slots'] === '1') {
                            next_element.append('<a class="time-disabled slots' + classAMPM + '">' + element.show + ' (0)</a>');
                        } else {
                            next_element.append('<a class="time-disabled' + classAMPM + '">' + element.show + '</a>');
                        }
                    }

                });

                if (response.length === 0) {
                    next_element.html('<p class="time-message">' + ea_settings['trans.please-select-new-date'] + '</p>');
                }

                // enabled
                next_element.parent().removeClass('disabled');

                if (!plugin.settings.initScrollOff) {
                    next_element.find('.time-value:first').focus();
                } else {
                    plugin.settings.initScrollOff = false;
                }

            }, 'json')
                .always(function () {
                    plugin.removeLoader();
                });
        },
        /**
         * Appintment information - before user add personal
         * information
         */
        appSelected: function (element) {
            var plugin = this;

            this.placeLoader(this.$element.find('.selected-time'));

            // make pre reservation
            var options = {
                location: this.$element.find('[name="location"]').val(),
                service: this.$element.find('[name="service"]').val(),
                worker: this.$element.find('[name="worker"]').val(),
                date: this.$element.find('.date').datepicker().val(),
                end_date: this.$element.find('.date').datepicker().val(),
                start: this.$element.find('.selected-time').data('val'),
                check: ea_settings['check'],
                action: 'ea_res_appointment',
                _cb: Math.floor(Math.random() * 1000000)
            };

            // for booking overview
            var booking_data = {};
            booking_data.location = this.$element.find('[name="location"] > option:selected').text();
            booking_data.service = this.$element.find('[name="service"] > option:selected').text();
            booking_data.worker = this.$element.find('[name="worker"] > option:selected').text();
            booking_data.date = this.$element.find('.date').datepicker().val();
            booking_data.time = this.$element.find('.selected-time').data('val');
            booking_data.price = this.$element.find('[name="service"] > option:selected').data('price');

            var format = ea_settings['date_format'] + ' ' + ea_settings['time_format'];
            booking_data.date_time = moment(booking_data.date + 'T' + booking_data.time, ea_settings['default_datetime_format']).format(format);

            jQuery.get(ea_ajaxurl, options, function (response) {

                plugin.res_app = response.id;

                plugin.$element.find('.ea-cancel').data('_hash', response._hash);

                plugin.$element.find('.step').addClass('disabled');
                plugin.$element.find('.final').removeClass('disabled');

                plugin.$element.find('.final').find('select,input').first().focus();

                plugin.scrollToElement(plugin.$element.find('.final'));
                // set overview cancel_appointment
                var overview_content = '';

                overview_content = plugin.settings.overview_template({data: booking_data, settings: ea_settings});

                jQuery('#booking-overview').html(overview_content);

                plugin.$element.find('#ea-total-amount').on('checkout:done', function( event, checkoutId ) {
                    var paypal_input = plugin.$element.find('#paypal_transaction_id');

                    if (paypal_input.length == 0) {
                        paypal_input = jQuery('<input id="paypal_transaction_id" class="custom-field" name="paypal_transaction_id" type="hidden"/>');
                        plugin.$element.find('.final').append(paypal_input);
                    }

                    paypal_input.val(checkoutId);

                    // make final conformation
                    plugin.finalComformation(event);
                });

            }, 'json')
                .fail(function (response) {
                    alert(response.responseJSON.message);
                })
                .always(jQuery.proxy(function () {
                    this.removeLoader();
                }, plugin));
        },
        /**
         * Comform appointment
         */
        finalComformation: function (event) {
            event.preventDefault();

            var plugin = this;

            var form = this.$element.find('form');

            if (!form.valid()) {
                return;
            }

            this.$element.find('.ea-submit').prop('disabled', true);

            // make pre reservation
            var options = {
                id: this.res_app,
                check: ea_settings['check']
            };

            this.$element.find('.custom-field').not('.dummy').each(function (index, element) {
                var name = jQuery(element).attr('name');
                options[name] = jQuery(element).val();
            });

            options.action = 'ea_final_appointment';
            options._cb    = Math.floor(Math.random() * 1000000);

            jQuery.get(ea_ajaxurl, options, function (response) {
                plugin.$element.find('.ea-submit').hide();
                plugin.$element.find('.ea-cancel').hide();
                plugin.$element.find('#paypal-button').hide();

                if (ea_settings['show.display_thankyou_note'] == 1) {                    
                    plugin.$element.find('.step').hide();
                    var table_html = plugin.$element.find('#booking-overview').find('table').html();
                    plugin.$element.find('#booking-overview').show();
                    plugin.$element.find('#booking-overview').find('table').hide();
                    plugin.$element.find('.final').show();
                    plugin.$element.find('.ea_hide_show').hide();
                    plugin.$element.find('.ea-confirmation-subtext').hide();
                    plugin.$element.find('#booking-overview-header').hide();
                    plugin.$element.find('#ea-overview-message').hide();
                    plugin.$element.find('#ea-success-box').show();
                    plugin.$element.find('#ea-overview-details').html(table_html);
    
                    const meta = document.getElementById('ea-meta-data');
                    if (meta) {
                        const rawDateTime = meta.dataset.dateTime;
                        const service = meta.dataset.service;
                        const worker = meta.dataset.worker;
                        const location = meta.dataset.location;
                        const price = document.getElementById('ea-total-amount')?.dataset.price || '';
                        const currency = meta.dataset.currency;
                        const title = `${service} with ${worker}`;
                        const description = `Service: ${service}\nWorker: ${worker}\nPrice: ${price}${currency}`;
                        const startDateObj = new Date(rawDateTime);
                        if (isNaN(startDateObj.getTime())) {
                            console.error('Invalid date:', rawDateTime);
                            return;
                        }
    
                        const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000); // +1 hour
    
                        const formatDateForGoogle = (dateObj) =>
                            dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
                        const start = formatDateForGoogle(startDateObj);
                        const end = formatDateForGoogle(endDateObj);
    
                        const calendarUrl = new URL("https://calendar.google.com/calendar/render");
                        calendarUrl.searchParams.set("action", "TEMPLATE");
                        calendarUrl.searchParams.set("text", title);
                        calendarUrl.searchParams.set("dates", `${start}/${end}`);
                        calendarUrl.searchParams.set("details", description);
                        calendarUrl.searchParams.set("location", location);
                        calendarUrl.searchParams.set("trp", "false");
    
                        document.getElementById("ea-add-to-calendar").href = calendarUrl.toString();
                    }
    
                    switch (ea_settings['default.status']) {
                        case 'pending':
                            default_status_message = 'Your appointment has been submitted and is currently pending approval. You will be notified once it is confirmed';
                            break;
                        case 'confirmed':
                            default_status_message = 'Your appointment has been confirmed. Thank you!';
                            break;
                        case 'reservation':
                            default_status_message = 'Your appointment has been reserved. You will be notified once it is confirmed.';
                            break;
                        default:
                            default_status_message = 'Your appointment has been successfully submitted. You will receive an update shortly.';
                            break;
                    }
                    plugin.$element.find('.ea-status-note').text(default_status_message);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }else{
                    plugin.$element.find('.final').append('<h3 class="ea-done-message">' + _.escape(ea_settings['trans.done_message']) + '</h3>');
                }


                plugin.$element.find('form').find('input').prop('disabled', true);
                plugin.$element.find('.g-recaptcha').remove();

                // send an event
                plugin.triggerEvent();

                if (ea_settings['submit.redirect'] !== '') {
                    setTimeout(function () {
                        window.location.href = ea_settings['submit.redirect'];
                    }, 2000);
                }
            }, 'json')
                .fail(jQuery.proxy(function () {
                    this.$element.find('.ea-submit').prop('disabled', false);
                }, plugin));
        },
        singleConformation: function (event) {
            event.preventDefault();
            var plugin = this;

            var form = this.$element.find('form');

            if (!form.valid()) {
                return;
            }

            this.$element.find('.ea-submit').prop('disabled', true);

            // make pre reservation
            var options = {
                location: this.$element.find('[name="location"]').val(),
                service: this.$element.find('[name="service"]').val(),
                worker: this.$element.find('[name="worker"]').val(),
                date: this.$element.find('.date').datepicker().val(),
                end_date: this.$element.find('.date').datepicker().val(),
                start: this.$element.find('.selected-time').data('val'),
                check: ea_settings['check'],
                action: 'ea_res_appointment'
            };

            if (this.$element.find('.g-recaptcha-response').length === 1) {
                options.captcha = this.$element.find('.g-recaptcha-response').val();
            }

            options._cb    = Math.floor(Math.random() * 1000000);

            jQuery.get(ea_ajaxurl, options, function (response) {
                plugin.res_app = response.id;

                plugin.finalComformation(event);
            }, 'json')
                .fail(jQuery.proxy(function (response) {
                    alert(response.responseJSON.message);
                    this.$element.find('.ea-submit').prop('disabled', false);
                }, plugin))
                .always(jQuery.proxy(function () {
                    this.removeLoader();
                }, plugin));
        },
        triggerEvent: function () {
            // Create the event.
            var event = document.createEvent('Event');

            // Define that the event name is 'easyappnewappointment'.
            event.initEvent('easyappnewappointment', true, true);

            // send event to document
            document.dispatchEvent(event);
        },
        /**
         * Event when customer select time slot
         */
        triggerSlotSelectEvent: function () {
            // Create the event.
            var event = new Event('easyappslotselect');

            // send event to document
            document.dispatchEvent(event);
        },
        /**
         * Cancel appointment
         */
        cancelApp: function (event) {
            event.preventDefault();

            var plugin = this;

            this.$element.find('.final').addClass('disabled').prevAll('.step').removeClass('disabled');

            var _hash = plugin.$element.find('.ea-cancel').data('_hash');

            var options = {
                id: this.res_app,
                check: ea_settings['check'],
                _hash: _hash,
                action: 'ea_cancel_appointment'
            };

            if (ea_settings['pre.reservation'] === '0') {
                // remove selected time
                plugin.$element.find('.time').find('.selected-time').removeClass('selected-time');

                //plugin.scrollToElement(plugin.$element.find('.date'));
                plugin.chooseStep();
                return;
            }

            options._cb    = Math.floor(Math.random() * 1000000);

            jQuery.get(ea_ajaxurl, options, function (response) {
                if (response.data) {
                    // remove selected time
                    plugin.$element.find('.time').find('.selected-time').removeClass('selected-time');

                    //plugin.scrollToElement(plugin.$element.find('.date'));
                    plugin.chooseStep();
                    plugin.res_app = null;

                }
            }, 'json');
        },
        chooseStep: function () {
            var plugin = this;
            var $temp;

            switch (ea_settings['cancel.scroll']) {
                case 'calendar':
                    plugin.scrollToElement(plugin.$element.find('.date'));
                    break;
                case 'worker' :
                    $temp = plugin.$element.find('[name="worker"]');
                    $temp.val('');
                    $temp.change();
                    plugin.scrollToElement($temp);
                    break;
                case 'service' :
                    $temp = plugin.$element.find('[name="service"]');
                    $temp.val('');
                    $temp.change();
                    plugin.scrollToElement($temp);
                    break;
                case 'location' :
                    $temp = plugin.$element.find('[name="location"]');
                    $temp.val('');
                    $temp.change();
                    plugin.scrollToElement($temp);
                    break;
                case 'pagetop':
                    break;
            }
        },
        scrollToElement: function (element) {
            if (ea_settings.scroll_off === 'true') {
                return;
            }

            jQuery('html, body').animate({
                scrollTop: ( element.offset().top - 20 )
            }, 500);
        },

        parsePhoneField: function ($el) {
            var code = $el.parent().find('.ea-phone-country-code-part').val();
            var number = $el.parent().find('.ea-phone-number-part').val().replace(/^0+/, '');

            $el.parent().find('.full-value').val('+' + code + number);
        }
    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    jQuery.fn[pluginName] = function (options) {
        this.each(function () {
            if (!jQuery.data(this, "plugin_" + pluginName)) {
                jQuery.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
        // chain jQuery functions
        return this;
    };
})( jQuery, window, document );


(function($){
    jQuery('.ea-standard').eaStandard();
})( jQuery );