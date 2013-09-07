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
		transition: "fade",
		remove_empty_option: true,

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
		this.label = $('[for="'+this.element.attr('id')+'"]').attr('for', 'minict_'+this.element.attr('id'));

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
			this.input = $('<input type="text" value="'+(this.element.find("option[selected]").html() || "")+'" placeholder="'+(this.element.find("option[selected]").html() || this.options.placeholder)+'" '+ (this.element.is('[tabindex]') ? ('tabindex='+this.element.attr('tabindex')) : '') +' />').appendTo(this.wrapper);

			// parse the select itself, and create the dropdown markup
			this.ul = $('<ul>'+m.parseSelect()+'<li class="'+m.options.class_empty+'">'+m.options.empty+'</li></ul>').appendTo(this.wrapper);
			this.items = this.wrapper.find('li');
			// if it's preselected, select the option itself as well
			if(this.element.find("option[selected]").length)
				this.items.filter('[data-value="'+this.element.find("option[selected]").val()+'"]').addClass(m.options.class_selected);

			// LISTEN TO THE ORIGINAL FOR CHANGES
			m.element.on("change", function(){
				var current = m.items.filter("."+m.options.class_selected),
					markup = m.parseSelect();

				if(m.element.val() != current.data("value")){
					m.hideChoices(m.wrapper, function() {
						if (m.element.val() === "") {
							// A common convention is to have an
							// empty option in a select list to act
							// as a place holder. Thus we only want
							// display an input value if the input
							// is non-empty
							m.input.val('').attr('placeholder', m.options.placeholder);
						} else {
							m.ul.html(markup+'<li class="'+m.options.class_empty+'">'+m.options.empty+'</li>');
							m.items = m.wrapper.find('li');
							m.selectChoice(m.items.filter('[data-value="'+m.element.val()+'"]'));
						}
					});
				}
			});

			// BIND EVENTS
			// hide dropdown when you click elsewhere
			$(document).on("click", function(){ m.hideChoices(m.wrapper) });
			// hide dropdown when moving focus outside it
			$("*").not(m.wrapper).not(m.wrapper.find('*')).on("focus", function(){ m.hideChoices(m.wrapper) });
			// toggle dropdown when you click on the dropdown itself
			this.wrapper.on("click", function(e){ e.stopPropagation(); m.toggleChoices() });
			// toggle dropdown when you click on the associated label, if present
			this.label.on("click", function(e){ e.stopPropagation(); m.input.trigger('focus') });
			// select choice when you click on it
			this.wrapper.on("click", "li:not(."+m.options.class_group+", ."+m.options.class_empty+")", function(){ m.selectChoice($(this)) });
			// stop the dropdown from closing when you click on a group or empty placeholder
			this.wrapper.on("click", "li."+m.options.class_group+", li."+m.options.class_empty, function(e){
				e.stopPropagation();
				m.input.focus();
			});
			// key bindings for the input element
			this.input.on("focus click", function(e){
				e.stopPropagation();
				m.showChoices();
			}).on("keydown", function(e){
				// keyboard navigation
				switch(e.keyCode) {
					// up
					case 38:
						m.navigateChoices('up');
						break;
					// down
					case 40:
						m.navigateChoices('down');
						break;
					// enter
					case 13:
					// tab
					case 9:
						// select the highlighted choice
						if(m.items.filter("."+m.options.class_highlighted).length)
							m.selectChoice(m.items.filter("."+m.options.class_highlighted));
						// or if there is none, select the first choice after filtering
						else if(m.input.val())
							m.selectChoice(m.items.not("."+m.options.class_group+", ."+m.options.class_empty).filter(':visible').first());
						if(e.keyCode===13){
							e.preventDefault();
							m.hideChoices(m.wrapper);
						}
						break;
					// escape
					case 27:
						// close the select and don't change the value
						m.hideChoices(m.wrapper);
						break;
				}
			}).on("keyup", function(e){
				// if we're not navigating, filter
				if($.inArray(e.keyCode, [38, 40, 13, 9, 27]) === -1){
					m.filterChoices();
				}
			});

			// after init callback
			this.options.afterinit();
		},

		// navigate with a keyboard
		// dr - direction we're going, either "up" or "down"
		navigateChoices: function(dr) {
			var m = this,
				wr = m.wrapper, // jQuery reference for the wrapper
				op = m.options, // options object
				items = m.items;
			// list all the elements that aren't navigatable
			var ignored = "."+op.class_hidden+", ."+op.class_empty+", ."+op.class_group;

			if(!items.filter("."+op.class_highlighted).length) { // if nothing is selected, select the first or last
				if(dr === 'up') {
					items.not(ignored).last().addClass(op.class_highlighted);
				} else if (dr === 'down') {
					items.not(ignored).first().addClass(op.class_highlighted);
				}
				return false;
			} else { // if something is selected...
				// ...remove current selection...
				cur = items.filter("."+op.class_highlighted);
				cur.removeClass(op.class_highlighted);
				// ...and figure out the next one
				if(dr === 'up') {
					if(items.not(ignored).first()[0] != cur[0]) { // if we're not at the first
						cur.prevAll("li").not(ignored).first().addClass(op.class_highlighted); // highlight the prev
						// make sure it's visible in a scrollable list
						var offset = items.filter("."+op.class_highlighted).offset().top - m.ul.offset().top + m.ul.scrollTop();
						if (m.ul.scrollTop() > offset)
							m.ul.scrollTop(offset);
					} else { // if we are at the first
						items.not(ignored).last().addClass(op.class_highlighted); // highlight the last
						// make sure it's visible in a scrollable list
						m.ul.scrollTop(m.ul.height());
					}
				} else if (dr === 'down') {
					if(items.not(ignored).last()[0] != cur[0]) { // if we're not at the last
						cur.nextAll("li").not(ignored).first().addClass(op.class_highlighted); // highlight the next
						// make sure it's visible in a scrollable list
						var ddbottom = m.ul.height(),
							libottom = items.filter("."+op.class_highlighted).offset().top - m.ul.offset().top + items.filter("."+op.class_highlighted).outerHeight();
						if (ddbottom < libottom)
							m.ul.scrollTop(m.ul.scrollTop() + libottom - ddbottom);
					} else { // if we are at the last
						items.not(ignored).first().addClass(op.class_highlighted); // highlight the first
						// make sure it's visible in a scrollable list
						m.ul.scrollTop(0);
					}
				}
			}
		},

		// parse the entire select based on whether it has optgroups or not, and return the new markup
		parseSelect: function() {
			var m = this, ulcontent = "";
			if( !m.element.find("optgroup").length ) { // if we don't have groups
				// just parse the elements regularly
				ulcontent = this.parseElements( m.element.html() );
			} else { // if we have groups
				// parse each group separately
				m.element.find("optgroup").each(function(){
					// create a group element
					ulcontent += '<li class="'+m.options.class_group+'">'+$(this).attr("label")+'</li>';
					// and add its children
					ulcontent += m.parseElements( $(this).html() );
				});
			}
			return ulcontent;
		},

		// turn option elements into li elements
		// elhtml - HTML containing the options
		parseElements: function(elhtml) {
			var m = this, readyhtml = "";
			// go through each option
			$( $.trim(elhtml) ).filter("option").each(function(){
				var $el = $(this);
				if ($el.attr('value') === '' && m.options.remove_empty_option) return;
				// create an li with a data attribute containing its value
				readyhtml += '<li data-value="'+$el.val()+'" class="'+($el.attr("class") || "")+'">'+$el.text()+'</li>';
			});
			// spit it out
			return readyhtml;
		},

		// toggle the visibility of the dropdown
		toggleChoices: function(){
			(!this.wrapper.hasClass(this.options.class_active)) ? this.showChoices() : this.hideChoices(this.wrapper);
		},

		// show the dropdown
		// cb - callback before the animation plays
		showChoices: function(cb){
			var m = this,
				wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options; // options object
			if (!wr.hasClass(op.class_active)){
				// keep the first and last classes up to date
				this.updateFirstLast(false);
				// close all other open minimalects
				$("."+op.class_container).each(function(){ //todo this doesn't work if the container classes are different
					if($(this)[0] !== wr[0])
						m.hideChoices($(this));
				});
				// internal callback
				if(typeof cb === 'function') cb.call();
				// add the active class
				wr.addClass(op.class_active);
				switch(op.transition) {
					case "fade":
					m.ul.fadeIn(150);
					break;
					default:
					m.ul.show();
					break;
				}
				// make the input editable
				this.input.val("").focus();
				// callback
				this.options.onopen();
			} else {
				// internal callback
				if(typeof cb === 'function') cb.call();
			}
		},

		resetDropdown: function(cb){
			var op = this.options; // options object
			// reset the filtered elements
			this.items.removeClass(op.class_hidden);
			// hide the empty error message
			this.wrapper.find("."+op.class_empty).hide();
			// reset keyboard navigation
			this.items.filter("."+op.class_highlighted).removeClass(op.class_highlighted);
			// internal callback
			if(typeof cb === 'function') cb.call();
		},

		// hide the dropdown
		// wr - jQuery reference for the wrapper
		// cb - callback for after the animation has played
		hideChoices: function(wr, cb){
			var op = this.options, // options object
				input = wr.find('input');
			if (wr.hasClass(op.class_active)){
				// remove the active class and fade out
				wr.removeClass(op.class_active);

				switch(op.transition) {
					case "fade":
					wr.children("ul").fadeOut(100);
					break;
					default:
					wr.children("ul").hide();
					break;
				}

				this.resetDropdown(cb);

				// blur the input
				input.blur();
				// reset it
				if(input.attr("placeholder") != op.placeholder) {
					// if we have a previously selected value, restore that
					input.val(input.attr("placeholder"));
				} else if(!this.items.filter("."+op.class_selected).length) {
					// if we have no selection, empty it to show placeholder
					input.val("");
				}
				// callback
				op.onclose();
			} else {
				// internal callback
				if(typeof cb === 'function') cb.call();
			}
		},

		// filter choices based on user input
		filterChoices: function(){
			var wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options; // options object
			// get the filter value
			var filter = this.input.val();
			// reset keyboard navigation
			this.items.filter("."+op.class_highlighted).removeClass(op.class_highlighted);

			// filter through each option
			this.items.not(op.class_group).each(function(){
				// if there's no match, hide it. otherwise, unhide it
				if ($(this).text().search(new RegExp(filter, "i")) < 0)
					$(this).addClass(op.class_hidden);
				else
					$(this).removeClass(op.class_hidden);
			});

			// make sure optgroups with no choices are hidden
			// sort of a kludge since we have no hierarchy
			this.items.filter("."+op.class_group).removeClass(op.class_hidden).each(function(){
				nextlis = $(this).nextAll("li").not("."+op.class_hidden+", ."+op.class_empty);
				if(nextlis.first().hasClass(op.class_group) || !nextlis.length) $(this).addClass(op.class_hidden);
			});

			// show a "no results" placeholder if there's nothing to show
			wr.find("."+op.class_empty).hide();
			if(!this.items.not("."+op.class_hidden+", ."+op.class_empty).length) {
				wr.find("."+op.class_empty).show();
				// callback, no results found
				this.options.onfilter(false);
			} else {
				// callback, results found
				this.options.onfilter(true);
			}

			// keep the first and last classes up to date
			this.updateFirstLast(true);
		},

		// select the choice defined
		// ch - jQuery reference for the li element the user has chosen
		selectChoice: function(ch){
			var el = this.element, // jQuery reference for the original select element
				op = this.options; // options object
			// apply the selected class
			this.items.removeClass(op.class_selected);
			ch.addClass(op.class_selected);

			// show it up in the input
			if(!ch.data('value')){
				// empty value = reset to placeholder
				this.input.val('').attr("placeholder", op.placeholder);
			}else{
				// new value
				this.input.val(ch.text()).attr("placeholder", ch.text());
			}

			// if the selected choice is different
			if(el.find('option:selected').val() != ch.data('value')){
				// update the original select element
				el.find("option:selected").prop("selected", false);
				el.find('option[value="'+ch.data("value")+'"]').prop("selected", true);
				// call original select change event
				el.trigger('change');
			}

			// callback
			this.options.onchange(ch.data("value"), ch.text());
		},

		// keep the first and last classes up-to-date
		// vi - whether we want to count visibility or not
		updateFirstLast: function(vi){
			var wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options; // options object
			wr.find("."+op.class_first+", ."+op.class_last).removeClass(op.class_first+" "+op.class_last);
			if(vi) {
				this.items.filter(":visible").first().addClass(op.class_first);
				this.items.filter(":visible").last().addClass(op.class_last);
			} else {
				this.items.first().addClass(op.class_first);
				this.items.not("."+op.class_empty).last().addClass(op.class_last);
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
