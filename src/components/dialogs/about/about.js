import * as utils from 'base/utils';
import Dialog from '../_dialog';
import globals from 'base/globals';

/*
 * Size dialog
 */

var About = Dialog.extend({

/**
 * Initializes the dialog component
 * @param config component configuration
 * @param context component context (parent)
 */
init: function(config, parent) {
  this.name = 'about';

  this._super(config, parent);
},
    
readyOnce: function(){
  var version = globals.version;
  var updated = new Date(parseInt(globals.build));
    
  this.element = d3.select(this.element);
  this.element.select(".vzb-about-text0")
      .html("Vizabi, a project")
  this.element.select(".vzb-about-text1")
      .html("by <a href='http://gapminder.org'>Gapminder Foundation</a>")
  this.element.select(".vzb-about-version")
      .html("<a href='https://github.com/Gapminder/vizabi/releases/tag/v"+version+"'>Version: "+version+"</a>");  
  this.element.select(".vzb-about-updated")
      .html("Build: " + d3.time.format("%Y-%m-%d at %H:%M")(updated));    
  this.element.select(".vzb-about-text2")
      .html("Pre-alpha, don't expect too much!");
  this.element.select(".vzb-about-credits")
      .html("<a href='https://github.com/Gapminder/vizabi/graphs/contributors'>Contributors</a>");
}
    
    
});

export default About;