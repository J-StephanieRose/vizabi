/*!
 * VIZABI BARCHART
 */

(function () {

    "use strict";

    var Vizabi = this.Vizabi;
    var utils = Vizabi.utils;

    //warn client if d3 is not defined
    if (!Vizabi._require('d3')) return;
    
    
    
    // this function returns PDF values for a specified distribution
    // TODO this is in fact a universal utility function and thus it can go somewhere else
    var pdf = {
        //constants
        DISTRIBUTIONS_NORMAL: "normal distribution",
        DISTRIBUTIONS_LOGNORMAL: "lognormal distribution",
        
        y: function(x, mu, variance, type){
            if (type==null) type = this.DISTRIBUTIONS_NORMAL;
            switch(type){
                case this.DISTRIBUTIONS_NORMAL:
                return Math.exp(
                    - 0.5 * Math.log(2 * Math.PI)
                    - Math.log(variance)/2
                    - Math.pow(x - mu, 2) / (2 * variance)
                    );

                case this.DISTRIBUTIONS_LOGNORMAL:
                return Math.exp(
                    - 0.5 * Math.log(2 * Math.PI) - Math.log(x)
                    - Math.log(variance)/2
                    - Math.pow(Math.log(x) - mu, 2) / (2 * variance)
                    );
            }
        }
    };



    
    


  //BAR CHART COMPONENT
  Vizabi.Component.extend('gapminder-mountainchart', {

    /**
     * Initializes the component (Bar Chart).
     * Executed once before any template is rendered.
     * @param {Object} config The options passed to the component
     * @param {Object} context The component's parent
     */
    init: function (config, context) {
      
            var _this = this;
            this.name = 'mountainchart';
            this.template = 'src/tools/mountainchart/mountainchart.html';
            
            //define expected models for this component
            this.model_expects = [{name: "time", type: "time"},
                                  {name: "entities", type: "entities"},
                                  {name: "marker", type: "model"},
                                  {name: "language", type: "language"}];

            this.model_binds = {
                "change": function(evt) {
                    if (!_this._readyOnce) return;
                    if (evt=="change:time:value") return;
                    console.log("change", evt);
                },
                'change:time:value': function() {
                    //console.log("change time value");
                    _this.updateTime();
                    _this.redrawDataPoints();
                },
                'change:marker:stack': function() {
                    //console.log("change marker stack");
                    this.updateEntities();
                    this.resize();
                    this.updateTime();
                    this.redrawDataPoints();
                }
            }



        this._super(config, context);

        this.xScale = null;
        this.yScale = null;
        this.cScale = null;

        this.xAxis = d3.svg.axisSmart();

        this.cached = [];

        // define path generator
        this.area = d3.svg.area()
            .x(function(d) { return _this.xScale(d.x) })
            .y0(function(d) { return _this.yScale(d.y0) })
            .y1(function(d) { return _this.yScale(d.y0+d.y) });

        this.stack = d3.layout.stack()
            //.order("inside-out")
            .values(function(d) {return d.points; });

        // define sorting order: lower peaks to front for easier selection
        this.order = function order(a, b) {
            return peak(b) - peak(a);
        }
    },

    /**
     * DOM is ready
     */
    readyOnce: function () {

        this.element = d3.select(this.element);

        // reference elements
        this.graph = this.element.select('.vzb-mc-graph');
        this.xAxisEl = this.graph.select('.vzb-mc-axis-x');
        this.xTitleEl = this.graph.select('.vzb-mc-axis-x-title');
        this.yearEl = this.graph.select('.vzb-mc-year');
        this.mountainContainer = this.graph.select('.vzb-mc-mountains');
        this.mountains = null;
        this.tooltip = this.element.select('.vzb-tooltip');

        

        var _this = this;
        this.on("resize", function () {
            console.log("acting on resize");
            _this.resize();
            _this.updateTime();
            _this.redrawDataPoints();
        });
        
        this.KEY = this.model.entities.getDimension();
        this.TIMEDIM = this.model.time.getDimension();

        this.updateEntities();
        this.resize();
        this.updateTime();
        this.redrawDataPoints();
    },


    /**
     * Updates entities
     */
    updateEntities: function () {

        this.translator = this.model.language.getTFunction();

        var xTitle = this.xTitleEl.selectAll("text").data([0]);
        xTitle.enter().append("text");
        xTitle.text(this.translator(this.model.marker.axis_x.unit));

        //scales
        this.yScale = this.model.marker.axis_y.getScale();
        this.xScale = this.model.marker.axis_x.getScale();
        this.cScale = this.model.marker.color.getScale();

        var _this = this;
        this.xAxis.tickFormat(function(d) {
            return _this.model.marker.axis_x.getTick(d);
        });


        //TODO remove magic constant
        
        this.xScale
            .domain(this.model.marker.axis_x.scaleType == "log" ? [0.01,1000] : [0,20]);
        
        

        this.cached = this.model.marker.getKeys()
            .map(function (d) {
              var pointer = {};
              pointer[_this.KEY] = d[_this.KEY];
              pointer[_this.TIMEDIM] = _this.model.time.end;
              pointer.sortValue = _this.peakValue(pointer);
              return pointer;
            })
            .sort(function (a, b) {
              return b.sortValue - a.sortValue;
            })
        
        
        this.mountains = this.mountainContainer.selectAll('.vzb-mc-mountain')
            .data(this.cached, function (d) {
                return d[_this.KEY];
            });
            
        var peaks = this.cached.map(function(d){return d.sortValue});
        
        this.yScale
            .domain([0, this.model.marker.stack ? d3.sum(peaks) : d3.max(peaks) ]);
            
        
        //exit selection
        this.mountains.exit().remove();

        //enter selection -- init circles
        this.mountains.enter().append("path")
            .attr("class", "vzb-mc-mountain")
            .on("mousemove", function(d, i) {
                var mouse = d3.mouse(_this.graph.node()).map(function(d) {
                    return parseInt(d);
                });

                //position tooltip
                _this.tooltip.classed("vzb-hidden", false)
                    .attr("style", "left:" + (mouse[0] + 50) + "px;top:" + (mouse[1] + 50) + "px")
                    .html(_this.model.marker.label.getValue(d));

            })
            .on("mouseout", function(d, i) {
                _this.tooltip.classed("vzb-hidden", true);
            })
            .on("click", function(d, i) {
                _this.model.entities.selectEntity(d);
            });
        
    },

      
    /*
     * UPDATE TIME:
     * Ideally should only update when time or data changes
     */
    updateTime: function() {
        var _this = this;

        this.time = this.model.time.value;
        this.yearEl.text(this.time.getFullYear().toString());
    
    },
      
      
    generateDistribution: function(d){
        var _this = this;
        // we need to generate the distributions based on mu, variance and scale
        // we span a uniform range of 'points' across the entire X scale,
        // resolution: 1 point per pixel. If width not defined assume it equal 500px
        var rangeFrom = Math.log(_this.xScale.domain()[0]);
        var rangeTo = Math.log(_this.xScale.domain()[1]);
        var rangeStep = (rangeTo - rangeFrom)/(this.width?this.width:500);

        var norm = _this.model.marker.axis_y.getValue(d);
        var mean = _this.model.marker.axis_x.getValue(d);
        var variance = _this.model.marker.size.getValue(d);
        
        
        var result =  d3.range(rangeFrom, rangeTo, rangeStep)
            .map(function(dX){
                // get Y value for every X
                return {x: Math.exp(dX),
                        y0: 0, // the initial base of areas is at zero
                        y: norm * pdf.y(Math.exp(dX), Math.log(mean), variance, pdf.DISTRIBUTIONS_LOGNORMAL)
                       }
            });
        
        
        return result;
    },   
        
    peakValue: function(d){
        return d3.max( this.generateDistribution(d).map(function(m){return m.y}) )
    },
      
      
    /**
     * Executes everytime the container or vizabi is resized
     * Ideally,it contains only operations related to size
     */
    resize: function () {

        var margin;
        var tick_spacing;
        var padding = 2;

        switch (this.getLayoutProfile()) {
            case "small":
                margin = {top: 30, right: 20, left: 20, bottom: 40};
                tick_spacing = 60;
                break;
            case "medium":
                margin = {top: 30, right: 30, left: 30, bottom: 40};
                tick_spacing = 80;
                break;
            case "large":
                margin = {top: 30, right: 30, left: 30, bottom: 40};
                tick_spacing = 100;
                break;
        };

        this.height = parseInt(this.element.style("height"), 10) - margin.top - margin.bottom;
        this.width = parseInt(this.element.style("width"), 10) - margin.left - margin.right;

        //graph group is shifted according to margins (while svg element is at 100 by 100%)
        this.graph
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //year is centered
        this.yearEl
            .attr("x", this.width / 2)
            .attr("y", this.height / 3 * 1)
            .style("font-size", Math.max(this.height / 4, this.width / 4) + "px");

        //update scales to the new range
        this.yScale.range([this.height, 0]);
        this.xScale.range([0, this.width]);
        

        //axis is updated
        this.xAxis.scale(this.xScale)
            .orient("bottom")
            .tickSize(6, 0)
            .tickSizeMinor(3, 0)
            .labelerOptions({
                scaleType: this.model.marker.axis_x.scaleType,
                toolMargin: margin
            });


        this.xAxisEl
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis);

        this.xTitleEl
            .attr("transform", "translate(0," + this.height + ")")
            .select("text")
            .attr("dy", "-0.36em")

    },

    /*
     * REDRAW DATA POINTS:
     * Here plotting happens
     */
    redrawDataPoints: function() {                
        var _this = this;

        //update selection
        //var speed = this.model.time.speed;
        
        //regenerate distributions
        this.cached.forEach(function(d, i){
            _this.cached[i][_this.TIMEDIM] = _this.time;
            _this.cached[i].points = _this.generateDistribution(d);
        })
        
        
        if(_this.model.marker.stack) _this.stack(this.cached);

        this.mountains
            .style("fill", function(d) {
                return _this.cScale(_this.model.marker.color.getValue(d));
            })
            //.transition().duration(speed).ease("linear")
            .attr("d", function(d,i) { return _this.area(_this.cached[i].points); }) 


    }
      
  });


}).call(this);
