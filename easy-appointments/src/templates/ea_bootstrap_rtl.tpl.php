<style type="text/css">
    .ea-rtl-label.ea-rtl-label.ea-rtl-label.ea-rtl-label {
        /*text-align: left;*/
    }
</style>
<script type="text/javascript">
    var ea_ajaxurl = '<?php echo esc_url( admin_url("admin-ajax.php") ); ?>';
</script>
<script type="text/template" id="ea-bootstrap-main">
<div class="ea-bootstrap" translate="no" style="max-width: <%- settings.width %>;">
    <form class="form-horizontal">
        <% if (settings.layout_cols === '2') { %>
        <div class="col-md-6" style="padding-top: 25px;">
            <% } %>
            <div class="step form-group">
                <div class="block"></div>
                <div class="col-sm-8">
                    <select name="location" data-c="location" class="filter form-control">
                        <?php $this->get_options('locations', $location_id, $service_id, $worker_id) ?>
                    </select>
                </div>
            <label class="ea-label col-sm-4 control-label ea-rtl-label">
                <?php echo esc_html($this->options->get_option_value("trans.location"));?>
            </label>
        </div>
        <div class="step form-group">
            <div class="block"></div>
            <div class="col-sm-8">
                <select name="service" data-c="service" class="filter form-control" data-currency="<?php echo $this->options->get_option_value("trans.currency");?>">
                    <?php $this->get_options('services', $location_id, $service_id, $worker_id) ?>
                </select>
            </div>
            <label class="ea-label col-sm-4 control-label ea-rtl-label">
                <?php echo esc_html($this->options->get_option_value("trans.service")); ?>
            </label>
        </div>
        <div class="step form-group">
            <div class="block"></div>
            <div class="col-sm-8">
                <select name="worker" data-c="worker" class="filter form-control">
                    <?php $this->get_options('staff', $location_id, $service_id, $worker_id) ?>
                </select>
            </div>
            <label class="ea-label col-sm-4 control-label ea-rtl-label">
                <?php echo esc_html($this->options->get_option_value("trans.worker")); ?>
            </label>
        </div>
        <div class="step calendar" class="filter">
            <div class="block"></div>
            <div class="date"></div>
        </div>
        <div class="step" class="filter">
            <div class="block"></div>
            <div class="time"></div>
        </div>
        <% if (settings.layout_cols === '2') { %>
        </div>
        <div class="step final col-md-6">
        <% } else { %>
        <div class="step final">
        <% } %>
            <div class="block"></div>
            <h3><%- settings['trans.personal-informations'] %></h3>
            <small><%- settings['trans.fields'] %></small>

            <% _.each(settings.MetaFields, function(item,key,list) { %>
            <% if (item.visible == "0") { return; } %>
            <% if (item.visible == "2") { %>
            <input id="<%- item.slug %>" name="<%- item.slug %>" type="hidden" value="<%- item.default_value %>" class="custom-field" />
            <% return; } %>
            <div class="form-group">
                <div class="col-sm-8">
                    <% if(item.type === 'INPUT') { %>
                    <input class="form-control custom-field" maxlength="499" type="text" name="<%- item.slug %>" placeholder="<%- item.mixed %>" value="<%- item.default_value %>" <% if (item.required == "1") { %>data-rule-required="true" data-msg-required="<%- settings['trans.field-required'] %>"<% } %> <% if (item.validation == "email") { %>data-rule-email="true" data-msg-email="<%- settings['trans.error-email'] %>"<% } %>>
                    <% } else if(item.type === 'MASKED') { %>
                    <input id="<%- item.slug %>" class="form-control custom-field masked-field" <% if (item.required == "1") { %>data-rule-required="true" data-msg-required="<%- settings['trans.field-required'] %>"<% } %> type="text" name="<%- item.slug %>" placeholder="<%- _.escape(item.mixed) %>" data-inputmask="'mask':'<%- item.default_value %>'" />
                    <% } else if(item.type === 'EMAIL') { %>
                    <input class="form-control custom-field" maxlength="499" type="text" name="<%- item.slug %>" placeholder="<%- item.mixed %>" value="<%- item.default_value %>"
                    <% if (item.required == "1") { %>data-rule-required="true" data-msg-required="<%- settings['trans.field-required'] %>"<% } %> data-rule-email="true" data-msg-email="<%- settings['trans.error-email'] %>">
                    <% } else if(item.type === 'SELECT') { %>
                        <select class="form-control custom-field" name="<%- item.slug %>" <% if (item.required == "1") { %>aria-required="true" <% if (item.required == "1") { %>data-rule-required="true"<% } %> data-msg-required="<%- settings['trans.field-required'] %>"<% } %>>
                            <% _.each(item.mixed.split(','),function(i,k,l) { %>
                            <% if (i == "-") { %>
                            <option value="">-</option>
                            <% } else { %>
                            <option value="<%- i %>" ><%- i %></option>
                            <% }});%>
                        </select>
                    <% } else if(item.type === 'TEXTAREA') { %>
                        <textarea class="form-control custom-field" rows="3" maxlength="499" style="height: auto;" placeholder="<%- item.mixed %>" name="<%- item.slug %>" <% if (item.required == "1") { %>data-rule-required="true" data-msg-required="<%- settings['trans.field-required'] %>"<% } %>></textarea>
                    <% } %>
                </div>
                <label class="col-sm-4 control-label ea-rtl-label"><%- item.label %> <% if (item.required == "1") { %>*<% } %> :</label>
            </div>
            <% });%>
            <h3 id="booking-overview-header"><%- settings['trans.booking-overview'] %></h3>
            <div id="booking-overview"></div>
            <% if (settings['show.iagree'] == '1') { %>

            <div class="form-group">
                <div class="col-sm-8">
                    <div class="checkbox">
                        <label class="i-agree">
                            <input id="ea-iagree" name="iagree" type="checkbox" data-rule-required="true" data-msg-required="<%- settings['trans.field-iagree'] %>">
                            <%- settings['trans.iagree'] %>
                        </label>
                    </div>
                </div>
                <label class="col-sm-4 control-label">&nbsp;</label>
            </div>
            <% } %>

            <% if (settings['gdpr.on'] == '1') { %>

            <div class="form-group">
                <label class="col-sm-4 control-label">&nbsp;</label>
                <div class="col-sm-8">
                    <div class="checkbox">
                        <label class="gdpr">
                            <input id="ea-gdpr" name="gdpr" type="checkbox" data-rule-required="true"
                                   data-msg-required="<%- settings['gdpr.message'] %>">
                            <% if (settings['gdpr.link'] != '') { %>
                            <a href="<%- settings['gdpr.link'] %>" target="_blank"><%- settings['gdpr.label'] %></a>
                            <% } else {%>
                            <%- settings['gdpr.label'] %>
                            <% } %>
                        </label>
                    </div>
                </div>
            </div>
            <% } %>

            <% if (settings['captcha.site-key'] !== '') { %>
            <div style="width: 100%" class="g-recaptcha" data-sitekey="<%- settings['captcha.site-key'] %>"></div><br>
            <% } %>

            <div class="form-group">
                <div class="col-sm-offset-4 col-sm-8 ea-actions-group" style="display: inline-flex;">
                    <?php echo apply_filters('ea_checkout_button', '<button class="ea-btn ea-submit btn btn-primary"><%- settings[\'trans.submit\'] %></button>');?>
                    <button class="ea-btn ea-cancel btn btn-default"><%- settings['trans.cancel'] %></button>
                </div>
            </div>
        </div>
        <% if (settings.layout_cols === '2') { %>
        </div>
        <% } %>
    </form>
</div>
<div id="ea-loader"></div>
</script>