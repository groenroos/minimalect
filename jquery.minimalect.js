/************************************
          MINIMALECT 0.8b
  A minimalistic select replacement

 jQuery 1.7+ required.
 Developed by @groenroos
 http://www.groenroos.fi

 Github: http://git.io/Xedg9w

 Licensed under the MIT license.

************************************/

;(function ( $, window, document, undefined ) {

	var pluginName = "minimalect",
	defaults = {
		// settings
		theme: "", // name of the theme used

		// messages
		placeholder: "Select a choice", // default placeholder when nothing is selected
		empty: "No results match your keyword.", // error message when nothing matches the filter search term

		// classes
		class_container: "minict_wrapper", // wrapper div for the element
		class_group: "minict_group", // list item for an optgroup
		class_empty: "minict_empty", // "No results" message
		class_active: "active", // applied to wrapper when the dropdown is displayed
		class_selected: "selected", // the currently selected item in the dropdown
		class_hidden: "hidden", // an item that doesn't match the filter search term
		class_highlighted: "highlighted", // item highlighted by keyboard navigation
		class_first: "minict_first", // first visible element
		class_last: "minict_last", // last visible element

		// callbacks
		beforeinit: function(){}, // called before Minimalect is initialized
		afterinit: function(){}, // called right after Minimalect is initialized
		onchange: function(){}, // called whenever the user changes the selected value
		onopen: function(){}, // called when the dropdown is displayed
		onclose: function(){}, // called when the dropdown is hidden
		onfilter: function(){} // called every time the filter has been activated
	};

	// The actual plugin constructor
	function Plugin( element, options ) {
		this.element = $(element);
		this.options = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	}

	Plugin.prototype = {

		init: function() {

			// before init callback
			this.options.beforeinit();

			// PREPWORK

			var m = this;

			// create the wrapper
			this.wrapper = $('<div class="'+this.options.class_container+'"></div>');
			// hide the original select and add the wrapper
			this.element.hide().after(this.wrapper);
			// apply the current theme to the wrapper
			if(this.options.theme) this.wrapper.addClass(this.options.theme);
			// create and add the input
			this.wrapper.append('<input type="text" value="'+(this.element.find("option:selected").html() || "")+'" placeholder="'+(this.element.find("option:selected").html() || this.options.placeholder)+'" />');

			// parse the select itself, and create the dropdown markup
			this.wrapper.append('<ul>'+m.parseSelect(m.element, m.options)+'<li class="'+m.options.class_empty+'">'+m.options.empty+'</li></ul>');
			// if it's preselected, select the option itself as well
			if(this.element.find("option:selected").length > 0)
				this.wrapper.find('li[data-value="'+this.element.find("option:selected:").val()+'"]').addClass(m.options.class_selected);


			// LISTEN TO THE ORIGINAL FOR CHANGES
			m.element.on("change", function(){
				var current = m.wrapper.find("li."+m.options.class_selected),
					markup = m.parseSelect(m.element, m.options);

				if(m.element.val() != current.attr("data-value")){
					m.hideChoices(m.wrapper, m.options, function(){
						m.wrapper.children("ul").html(markup+'<li class="'+m.options.class_empty+'">'+m.options.empty+'</li>');
						m.selectChoice(m.wrapper.find('li[data-value="'+m.element.val()+'"]'), m.wrapper, m.element, m.options);
					});
				}
			});



			// BIND EVENTS

			// hide dropdown when you click elsewhere
			$(document).on("click", function(){ m.hideChoices(m.wrapper, m.options) });
			// toggle dropdown when you click on the dropdown itself
			this.wrapper.on("click", function(e){ e.stopPropagation(); m.toggleChoices(m.wrapper, m.options) });
			// select choice when you click on it
			this.wrapper.on("click", "li:not(."+m.options.class_group+", ."+m.options.class_empty+")", function(){ m.selectChoice($(this), m.wrapper, m.element, m.options) });
			// stop the dropdown from closing when you click on a group or empty placeholder
			this.wrapper.on("click", "li."+m.options.class_group+", li."+m.options.class_empty, function(e){
				e.stopPropagation();
				m.wrapper.children("input").focus();
			});
			// key bindings for the input element
			this.wrapper.find("input").on("focus click", function(e){
				e.stopPropagation();
				m.showChoices(m.wrapper, m.options);
			}).on("keyup", function(e){
				// keyboard navigation
				switch(e.keyCode) {
					// up
					case 38:
						m.navigateChoices('up', m.wrapper, m.options);
						return false;
						break;
					// down
					case 40:
						m.navigateChoices('down', m.wrapper, m.options);
						return false;
						break;
					// enter
					case 13:
					    // select the highlighted choice, or if there is none, select the first choice
						if(m.wrapper.find("li."+m.options.class_highlighted).length != 0)
							m.selectChoice(m.wrapper.find("li."+m.options.class_highlighted), m.wrapper, m.element, m.options);
						else
							m.selectChoice(m.wrapper.find("li:not(."+m.options.class_group+", ."+m.options.class_empty+")").first(), m.wrapper, m.element, m.options);

					// hide the dropdown
					m.hideChoices(m.wrapper, m.options);
					return false;
					break;
				}
				// if we're not navigating, filter
				m.filterChoices(m.wrapper, m.options)
			});

			// after init callback
			this.options.afterinit();
		},

		// navigate with a keyboard
		// dr - direction we're going, either "up" or "down"
		// wr - jQuery reference for the wrapper
		// op - options object
		navigateChoices: function(dr, wr, op) {
			// list all the elements that aren't navigatable
			ignored = "."+op.class_hidden+", ."+op.class_empty+", ."+op.class_group;

			if(wr.find("li."+op.class_highlighted).length == 0) { // if nothing is selected, select the first or last
				if(dr == 'up') {
					wr.find("li:not("+ignored+")").last().addClass(op.class_highlighted);
				} else if (dr == 'down') {
					wr.find("li:not("+ignored+")").first().addClass(op.class_highlighted);
				}
				return false;
			} else { // if something is selected...
				// ...remove current selection...
				cur = wr.find("li."+op.class_highlighted);
				cur.removeClass(op.class_highlighted);
				// ...and figure out the next one
				if(dr == 'up') {
					if(wr.find("li:not("+ignored+")").first()[0] != cur[0]) { // if we're not at the first
						cur.prevAll("li").not(ignored).first().addClass(op.class_highlighted); // highlight the prev
						// make sure it's visible in a scrollable list
						var dropdown = wr.children("ul"),
						    offset = wr.find("li."+op.class_highlighted).offset().top - dropdown.offset().top + dropdown.scrollTop();
						if (dropdown.scrollTop() > offset)
							dropdown.scrollTop(offset)
					} else { // if we are at the first
						wr.find("li:not("+ignored+")").last().addClass(op.class_highlighted); // highlight the last
						// make sure it's visible in a scrollable list
						wr.children("ul").scrollTop(wr.children("ul").height());
					}
				} else if (dr == 'down') {
					if(wr.find("li:not("+ignored+")").last()[0] != cur[0]) { // if we're not at the last
						cur.nextAll("li").not(ignored).first().addClass(op.class_highlighted); // highlight the next
						// make sure it's visible in a scrollable list
						var dropdown = wr.children("ul"),
							ddbottom = dropdown.height(),
							libottom = wr.find("li."+op.class_highlighted).offset().top - dropdown.offset().top + wr.find("li."+op.class_highlighted).outerHeight();
						if (ddbottom < libottom)
							dropdown.scrollTop(dropdown.scrollTop() + libottom - ddbottom)
					} else { // if we are at the last
						wr.find("li:not("+ignored+")").first().addClass(op.class_highlighted); // highlight the first
						// make sure it's visible in a scrollable list
						wr.children("ul").scrollTop(0);
					}
				}
			}
		},

		// parse the entire select based on whether it has optgroups or not, and return the new markup
		// element - jQuery reference to the select
		// op - options object
		parseSelect: function(element, op) {
			var ulcontent = "", m = this;
			if( element.find("optgroup").length == 0 ) { // if we don't have groups
				// just parse the elements regularly
				ulcontent = this.parseElements( element.html() );
			} else { // if we have groups
				// parse each group separately
				element.find("optgroup").each(function(){
					// create a group element
					ulcontent += '<li class="'+op.class_group+'">'+$(this).attr("label")+'</li>';
					// and add its children
					ulcontent += m.parseElements( $(this).html() );
				});
			}
			return ulcontent;
		},

		// turn option elements into li elements
		// elhtml - HTML containing the options
		parseElements: function(elhtml) {
			var readyhtml = "";
			// go through each option
			$( $.trim(elhtml) ).filter("option").each(function(){
				// create an li with a data attribute containing its value
				readyhtml += '<li data-value="'+$(this).val()+'" class="'+$(this).attr("class")+'">'+$(this).text()+'</li>';
			});
			// spit it out
			return readyhtml;
		},

		// toggle the visibility of the dropdown
		// wr - jQuery reference for the wrapper
		// op - options object
		toggleChoices: function(wr, op){
			(!wr.hasClass(op.class_active)) ? this.showChoices(wr, op) : this.hideChoices(wr, op);
		},

		// show the dropdown
		// wr - jQuery reference for the wrapper
		// op - options object
		// cb - callback before the animation plays
		showChoices: function(wr, op, cb){
			if (!wr.hasClass(op.class_active)){
				// keep the first and last classes up to date
				this.updateFirstLast(false, wr, op);
				// close all other open minimalects
				var m = this;
				$("."+op.class_container).each(function(){
					if($(this)[0] != wr[0])
						m.hideChoices($(this), op);
				});
				// internal callback
				if(typeof cb == 'function') cb.call();
				// add the active class and fade in
				wr.addClass(op.class_active).children("ul").fadeIn(150);
				// make the input editable
				wr.children("input").val("").focus();
				// callback
				this.options.onopen();
			} else {
				// internal callback
				if(typeof cb == 'function') cb.call();
			}
		},

		// hide the dropdown
		// wr - jQuery reference for the wrapper
		// op - options object
		// cb - callback for after the animation has played
		hideChoices: function(wr, op, cb){
			if (wr.hasClass(op.class_active)){
				// remove the active class and fade out
				wr.removeClass(op.class_active).children("ul").fadeOut(100, function(){
					// reset the filtered elements
					wr.find("li").removeClass(op.class_hidden);
					// hide the empty error message
					wr.find("."+op.class_empty).hide();
					// reset keyboard navigation
					wr.find("li."+op.class_highlighted).removeClass(op.class_highlighted);
					// internal callback
					if(typeof cb == 'function') cb.call();
				});

				// blur the input
				wr.children("input").blur();
				// reset it
				if(wr.children("input").attr("placeholder") != op.placeholder) {
					// if we have a previously selected value, restore that
					wr.children("input").val(wr.children("input").attr("placeholder"));
				} else if(wr.find("li."+op.class_selected).length == 0) {
					// if we have no selection, empty it to show placeholder
					wr.children("input").val("");
				}
				// callback
				this.options.onclose();
			} else {
				// internal callback
				if(typeof cb == 'function') cb.call();
			}
		},

		// filter choices based on user input
		// wr - jQuery reference for the wrapper
		// op - options object
		filterChoices: function(wr, op){
			// get the filter value
			var filter = wr.children("input").val();
			// reset keyboard navigation
			wr.find("li."+op.class_highlighted).removeClass(op.class_highlighted);

			// filter through each option
			wr.find("li:not("+op.class_group+")").each(function(){
				// if there's no match, hide it. otherwise, unhide it
				if ($(this).text().search(new RegExp(filter, "i")) < 0)
					$(this).addClass(op.class_hidden)
				else
					$(this).removeClass(op.class_hidden)
			});

			// make sure optgroups with no choices are hidden
			// sort of a kludge since we have no hierarchy
			wr.find("li."+op.class_group).removeClass(op.class_hidden).each(function(){
				nextlis = $(this).nextAll("li").not("."+op.class_hidden+", ."+op.class_empty);
				if(nextlis.first().hasClass(op.class_group) || nextlis.length == 0) $(this).addClass(op.class_hidden);
			});

			// show a "no results" placeholder if there's nothing to show
			wr.find("."+op.class_empty).hide();
			if(wr.find("li").not("."+op.class_hidden+", ."+op.class_empty).length == 0) {
				wr.find("."+op.class_empty).show();
				// callback, no results found
				this.options.onfilter(false);
			} else {
				// callback, results found
				this.options.onfilter(true);
			}

			// keep the first and last classes up to date
			this.updateFirstLast(true, wr, op);
		},

		// select the choice defined
		// ch - jQuery reference for the li element the user has chosen
		// wr - jQuery reference for the wrapper
		// el - jQuery reference for the original select element
		// op - options object
		selectChoice: function(ch, wr, el, op){
			// apply the selected class
			wr.find("li").removeClass(op.class_selected);
			ch.addClass(op.class_selected);
			// show it up in the input
			wr.children("input").val(ch.text()).attr("placeholder", ch.text());
			// update the original select element
			el.find("option:selected").prop("selected", false);
			el.find('option[value="'+ch.attr("data-value")+'"]').prop("selected", true);
			// callback
			this.options.onchange(ch.attr("data-value"), ch.text());
		},

		// keep the first and last classes up-to-date
		// vi - whether we want to count visibility or not
		// wr - jQuery reference for the wrapper
		// op - options object
		updateFirstLast: function(vi, wr, op){
			wr.find("."+op.class_first+", ."+op.class_last).removeClass(op.class_first+" "+op.class_last);
			if(vi) {
				wr.find("li:visible").first().addClass(op.class_first);
				wr.find("li:visible").last().addClass(op.class_last);
			} else {
				wr.find("li").first().addClass(op.class_first);
				wr.find("li").not("."+op.class_empty).last().addClass(op.class_last);
			}
		}
	};

	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
		});
	};

})( jQuery, window, document );
