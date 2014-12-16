require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/tokenutils",
    "underscore",
    "jquery",
    "splunkjs/mvc/simplexml",
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/chartview',
    'splunkjs/mvc/searchmanager',
    'splunk.util',
    //'app/views/single_trend'   
], function(
        mvc,
        utils,
        TokenUtils,
        _,
        $,
        DashboardController,
        TableView,
        ChartView,
        SearchManager,
        splunkUtil
        //SingleValueTrendIndicator         
    ) {

    // Tokens
    var submittedTokens = mvc.Components.getInstance('submitted', {create: true});
    var defaultTokens   = mvc.Components.getInstance('default', {create: true});

    //Closer
    var alert_details="#alert_details"; 
    var closer='<div class="closer icon-x"> close</div>';
    $(alert_details).prepend(closer);
  
    $(alert_details).on("click", '.closer', function() {
      // console.log ( $(alert_details).parent().parent().parent() );
        $(alert_details).parent().parent().parent().hide();
      // $(my_element_id).parent().parent().parent().width("100%");
    });  
    //$(my_element_id).parent().parent().parent().addClass("fix_panel");
    $(alert_details).parent().parent().parent().addClass("float_panel");


    var IconRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            // Only use the cell renderer for the specific field
            return (cell.field==="dosearch" || cell.field==="doedit" || cell.field == "owner");
        },
        render: function($td, cell) {
            if(cell.field=="owner") {
                if(cell.value!="unassigned") {
                    icon = 'user';
                    $td.addClass(cell.field).addClass('icon-inline').html(_.template('<i class="icon-<%-icon%>" style="padding-right: 2px"></i><%- text %>', {
                        icon: icon,
                        text: cell.value
                    }));                
                } else {
                    $td.addClass(cell.field).html(cell.value);
                }
            } else {
                if(cell.field=="dosearch") {
                    var icon = 'search';
                
                } else if (cell.field=="doedit") {
                    var icon = 'list';
                }
                var rendercontent='<div style="float:left; max-height:22px; margin:0px;"><i class="icon-<%-icon%>" >&nbsp;</i></div>';
                    
                $td.addClass('table_inline_icon').html(_.template(rendercontent, {
                    icon: icon
                }));                
            }            
        }
    });

    var DrillDownRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            // Only use the cell renderer for the specific field
            return (cell.field==="job_id" || cell.field==="status" 
                 || cell.field==="search" || cell.field==="event_search" || cell.field==="earliest" 
                 || cell.field==="latest" || cell.field==="severity" || cell.field==="priority");
        },
        render: function($td, cell) {
            // ADD class to cell -> CSS
            $td.addClass(cell.field).html(cell.value);
        }
    });

     // Row Coloring Example with custom, client-side range interpretation
    var ColorRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            // Enable this custom cell renderer for both the active_hist_searches and the active_realtime_searches field
            return _(['urgency']).contains(cell.field);
        },
        render: function($td, cell) {
            // Add a class to the cell based on the returned value
            var value = cell.value;
            // Apply interpretation for number of historical searches
            if (cell.field === 'urgency') {
                if (value == "informational") {
                    $td.addClass('range-cell').addClass('range-info');
                }
                else if (value == "low") {
                    $td.addClass('range-cell').addClass('range-low');
                }
                else if (value == "medium") {
                    $td.addClass('range-cell').addClass('range-medium');
                }
                else if (value == "high") {
                    $td.addClass('range-cell').addClass('range-high');
                }
                else if (value == "critical") {
                    $td.addClass('range-cell').addClass('range-critical');
                }
		        else if (value == "unknown") {
                    $td.addClass('range-cell').addClass('range-unknown');
                }
            }

            // Update the cell content
            //$td.text(value.toFixed(2)).addClass('numeric');
            $td.text(value);
        }
    });


    var EventSearchBasedRowExpansionRenderer = TableView.BaseRowExpansionRenderer.extend({
        initialize: function(args) {
            // initialize will run once, so we will set up a search and a chart to be reused.
            this._searchManager = new SearchManager({
                id: 'details-search-manager',
                preview: false
            });
            this._tableView = new TableView({
                managerid: 'details-search-manager',
                'drilldown': 'none'
            });
        },
        canRender: function(rowData) {
            // Since more than one row expansion renderer can be registered we let each decide if they can handle that
            // data
            // Here we will always handle it.
            return true;
        },
        render: function($container, rowData) {
            // rowData contains information about the row that is expanded.  We can see the cells, fields, and values
            // We will find the sourcetype cell to use its value
            var job_id = _(rowData.cells).find(function (cell) {
               return cell.field === 'job_id';
            });
            //update the search with the sourcetype that we are interested in
            this._searchManager.set({ search: 'index=alerts sourcetype=incident_change job_id="'+ job_id.value + '" | eval text=if(action="create","Incident created","Attribute " + attribute + " has been changed from " + old_value + " to " + new_value) | table _time, user, action, text' });
            // $container is the jquery object where we can put out content.
            // In this case we will render our chart and add it to the $container
            $container.append(this._tableView.render().el);
            //$container.append("Addtl. info");
        }
    });

    mvc.Components.get('alert_overview').getVisualization(function(tableView) {
        // Add custom cell renderer
        tableView.table.addCellRenderer(new ColorRenderer());
        tableView.table.addCellRenderer(new DrillDownRenderer());
        tableView.table.addCellRenderer(new IconRenderer());
        tableView.addRowExpansionRenderer(new EventSearchBasedRowExpansionRenderer());

        tableView.table.render();

    });

    
    $(document).on("click", "td", function(e) {
        
        // Displays a data object in the console
        e.preventDefault();
        // console.dir($(this));

        if ($(this).context.cellIndex!=1 && $(this).context.cellIndex!=2) {
            // Drilldown panel (loadjob)
            drilldown_job_id=($(this).parent().find("td.job_id")[0].innerHTML);
            submittedTokens.set("drilldown_job_id", drilldown_job_id);
            $(alert_details).parent().parent().parent().show();
        }
        else if ($(this).context.cellIndex==1){
            // Drilldown search (search view)
            var drilldown_search=($(this).parent().find("td.search")[0].innerHTML);
            var drilldown_search_earliest=($(this).parent().find("td.earliest")[0].innerHTML);
            var drilldown_search_latest=($(this).parent().find("td.latest")[0].innerHTML);
            console.debug("drilldown_search", drilldown_search)
            drilldown_search = drilldown_search.replace("&gt;",">").replace("&lt;","<");
            drilldown_search = encodeURIComponent(drilldown_search);
            console.debug("drilldown_search", drilldown_search);
            var search_url="search?q=search "+drilldown_search+"&earliest="+drilldown_search_earliest+"&latest="+drilldown_search_latest;

            window.open(search_url,'_search');

        }
        else if ($(this).context.cellIndex==2){
            // Incident settings

            var job_id = ($(this).parent().find("td.job_id")[0].innerHTML);
            var owner = ($(this).parent().find("td.owner")[0].innerText);
            console.debug("owner", owner)
            var priority = ($(this).parent().find("td.priority")[0].innerHTML);
            var status = ($(this).parent().find("td.status")[0].innerHTML);

            var edit_panel='' +
'<div class="modal fade modal-wide shared-alertcontrols-dialogs-editdialog in" id="edit_panel">' +
'    <div class="modal-content">' +
'      <div class="modal-header">' +
'        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
'        <h4 class="modal-title" id="exampleModalLabel">Edit Incident</h4>' +
'      </div>' +
'      <div class="modal-body modal-body-scrolling">' +
'        <div class="form form-horizontal form-complex" style="display: block;">' +
'          <div class="control-group shared-controls-controlgroup">' +
'            <label for="job_id" class="control-label">Incident:</label>' +
'            <div class="controls controls-block"><div class="control shared-controls-labelcontrol" id="job_id"><span class="input-label-job_id">' + job_id + '</span></div></div>' +
'          </div>' +
'          <div class="control-group shared-controls-controlgroup">' +
'            <label for="message-text" class="control-label">Priority:</label>' +
'            <div class="controls"><select name="priority" id="priority"></select></div>' +
'          </div>' +
'          <p class="control-heading">Incident Workflow</p>'+
'          <div class="control-group shared-controls-controlgroup">' +
'            <label for="recipient-name" class="control-label">Owner:</label>' +
'            <div class="controls"><input type="text" id="owner" value="' + owner + '"></input></div>' +
'          </div>' +
'          <div class="control-group shared-controls-controlgroup">' +
'            <label for="message-text" class="control-label">Status:</label>' +
'            <div class="controls"><select name="status" id="status"></select></div>' +
'          </div>' +
'          <div class="control-group shared-controls-controlgroup">' +
'            <label for="message-text" class="control-label">Comment:</label>' +
'            <div class="controls"><textarea type="text" name="comment" id="comment" class="" placeholder="optional"></textarea></div>' +
'          </div>' +
'        </div>' +
'      </div>' +
'      <div class="modal-footer">' +
'        <button type="button" class="btn cancel modal-btn-cancel pull-left" data-dismiss="modal">Cancel</button>' +
'        <button type="button" class="btn btn-primary" id="modal-save">Save</button>' +
'      </div>' +
'    </div>' +
'</div>';
            $('body').prepend(edit_panel);

            var all_prios = [ "low" ,"medium","high" ,"critical" ]
            $.each(all_prios, function(key, val) {
                if (val == priority) {
                    $('#priority').append( $('<option></option>').attr("selected", "selected").val(val).html(val) )
                } else {
                    $('#priority').append( $('<option></option>').val(val).html(val) )
                }
            }); //

            var all_status = { "new": "New", "assigned":"Assigned", "work_in_progress":"Work in progress", "resolved":"Resolved" }
            $.each(all_status, function(val, text) {
                if (val == status) {
                    $('#status').append( $('<option></option>').attr("selected", "selected").val(val).html(text) )
                } else {
                    $('#status').append( $('<option></option>').val(val).html(text) )
                }
            }); //

            $('#edit_panel').modal('show');
        }
    });
    
    $(document).on("click", "#modal-save", function(event){
        // save data here
        var job_id = $("#job_id > span").html();
        var owner  = $("#owner").val();
        var priority  = $("#priority").val();
        var status  = $("#status").val();
        var comment  = $("#comment").val();
        
        var update_entry = { 'job_id': job_id, 'owner': owner, 'priority': priority, 'status': status, 'comment': comment };
        console.debug("entry", update_entry);

        data = JSON.stringify(update_entry);
        var post_data = {
            contents    : data
        };

        var url = splunkUtil.make_url('/custom/alert_manager/incident_settings/save');
        console.debug("url", url);

        $.ajax( url,
            {
                uri:  url,
                type: 'POST',
                data: post_data,
                
                success: function(jqXHR, textStatus){
                    // Reload the table                        
                    mvc.Components.get("recent_alerts").startSearch()
                    $('#edit_panel').modal('hide');
                    $('#edit_panel').remove();
                    console.debug("success");
                },
                
                // Handle cases where the file could not be found or the user did not have permissions
                complete: function(jqXHR, textStatus){
                    console.debug("complete");
                },
                
                error: function(jqXHR,textStatus,errorThrown) {
                    console.log("Error");
                } 
            }
        );

    });

    // Find all single value elements created on the dashboard
    /*_(mvc.Components.toJSON()).chain().filter(function(el) {
        return el instanceof SingleElement;
    }).each(function(singleElement) {
                singleElement.getVisualization(function(single) {
                    // Inject a new element after the single value visualization
                    var $el = $('<div></div>').insertAfter(single.$el);
                    // Create a new change view to attach to the single value visualization
                    new SingleValueTrendIndicator(_.extend(single.settings.toJSON(), {
                        el: $el,
                        id: _.uniqueId('single')
                    }));
                });
            });*/
});
