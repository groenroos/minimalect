/************************************
          MINIMALECT 0.9
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
		reset: false,
		transition: "fade",
		transition_time: 150,
		remove_empty_option: true,
		searchable: true, // whether or not the combobox functionality is enabled
		ajax: null, // URL to an external resource
		debug: false, // whether to be verbose in the console
		live: true, // whether to automatically detect changes

		// messages
		placeholder: "Select a choice", // default placeholder when nothing is selected
		empty: "No results match your keyword.", // error message when nothing matches the filter search term
		error_message: "There was a problem with the request.", // error message when the AJAX call fails

		// classes
		class_container: "minict_wrapper", // wrapper div for the element
		class_group: "minict_group", // list item for an optgroup
		class_empty: "minict_empty", // "No results" message
		class_active: "active", // applied to wrapper when the dropdown is displayed
		class_disabled: "disabled", // applied to list elements that are disabled
		class_selected: "selected", // the currently selected item in the dropdown
		class_hidden: "hidden", // an item that doesn't match the filter search term
		class_highlighted: "highlighted", // item highlighted by keyboard navigation
		class_first: "minict_first", // first visible element
		class_last: "minict_last", // last visible element
		class_reset: "minict_reset", // reset link

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

		this._init();
	}

	Plugin.prototype = {

		// INITIALIZATION

		_init: function() {

			// before init callback
			this.options.beforeinit();

			// PREPWORK

			var op = this.options,
				m = this;
				
			if(op.ajax)
				op.live = false;

			// create the wrapper
			this.wrapper = $('<div class="'+op.class_container+'"></div>');
			// hide the original select and add the wrapper
			this.element.hide().after(this.wrapper);
			// apply the current theme to the wrapper
			if(op.theme) this.wrapper.addClass(op.theme);
			// reflect disabled status
			if(this.element.prop("disabled"))
				this.wrapper.addClass(op.class_disabled);

			// create and add the input
			this.input = $(
				'<span '+
				(op.searchable ? 'contenteditable="true"' : '') +
				' data-placeholder="'+(this.element.find("option[selected]").text() || this.element.attr("placeholder") || (op.placeholder != null) ? op.placeholder : this.element.find("option:first").text())+
				'" '+ (this.element.is('[tabindex]') ? ('tabindex='+this.element.attr('tabindex')) : '') +'>'+
				(this.element.find("option[selected]").html() || "")+
				'</span>'
			).appendTo(this.wrapper);

			// add the reset link, if it's wanted
			if(op.reset)
				this.reset = $('<a href="#" class="'+op.class_reset+'">&#215;</a>').appendTo(this.wrapper);

			// parse the select itself, and create the dropdown markup
			this.ul = $('<ul>'+this._parseSelect()+'<li class="'+op.class_empty+'">'+op.empty+'</li></ul>').appendTo(this.wrapper);
			this.items = this.wrapper.find('li');
			// if it's preselected, select the option itself as well
			if(this.element.find("option[selected]").length) {
				this._showResetLink();
				this.items.filter('[data-value="'+this.element.find("option[selected]").val()+'"]').addClass(op.class_selected);
			}

			// BIND EVENTS
			// hide dropdown when you click elsewhere
			$(document).on("click", function(){ m._hideChoices(m.wrapper) });
			// hide dropdown when moving focus outside it
			$("*").not(this.wrapper).not(this.wrapper.find('*')).on("focus", function(){ m._hideChoices(m.wrapper) });
			// toggle dropdown when you click on the dropdown itself
			this.wrapper.on("click", function(e){
				e.stopPropagation();
				// only close the dropdown when it's not disabled and not multiselect
				if(!m.element.prop("multiple") && !m.element.prop("disabled"))
					m._toggleChoices()
			});
			// toggle dropdown when you click on the associated label, if present
			this.label.on("click", function(e){ e.stopPropagation(); m.input.trigger('focus') });
			// select choice when you click on it
			this.wrapper.on("click", "li:not(."+op.class_group+", ."+op.class_empty+", ."+op.class_disabled+")", function(){ m._selectChoice($(this)) });
			// stop the dropdown from closing when you click on a group or empty placeholder
			this.wrapper.on("click", "li."+op.class_group+", li."+op.class_empty+", li."+op.class_disabled, function(e){
				e.stopPropagation();
				m.input.focus();
			});
			// if the original is focused or blurred manually, mimic it
			// also handle the custom update event
			this.element.on("focus", function(){
				m.element.blur();
				m._showChoices();
			})
				.on("blur", m._hideChoices)
				.on("update", m.update);

			// bind reset only if it's there
			if(op.reset){
				this.wrapper.on("click", "a."+op.class_reset, function(e){
					e.stopPropagation();
					m._resetChoice();
					return false;
				});
			}

			// key bindings for the input element
			this.input.on("focus click", function(e){
				e.stopPropagation();
				if(!m.element.prop("disabled")) m._showChoices(); else m.input.blur();
			}).on("keydown", function(e){
				// keyboard navigation
				switch(e.keyCode) {
					// up
					case 38:
						e.preventDefault();
						m._navigateChoices('up');
						break;
					// down
					case 40:
						e.preventDefault();
						m._navigateChoices('down');
						break;
					// enter
					case 13:
					// tab
					case 9:
						// select the highlighted choice
						if(m.items.filter("."+op.class_highlighted).length)
							m._selectChoice(m.items.filter("."+op.class_highlighted));
						// or if there is none, select the first choice after filtering
						else if(m.input.text())
							m._selectChoice(m.items.not("."+op.class_group+", ."+op.class_empty).filter(':visible').first());
						if(e.keyCode===13){
							e.preventDefault();
							m._hideChoices(m.wrapper);
						}
						break;
					// escape
					case 27:
						e.preventDefault();
						// close the select and don't change the value
						m._hideChoices(m.wrapper);
						break;
				}
			}).on("keyup", function(e){
				// if we're not navigating, filter
				if($.inArray(e.keyCode, [38, 40, 13, 9, 27]) === -1){
					m._filterChoices();
				}
			});

			// if mutation observing is supported
			if(window.MutationObserver){
				// observe the original for DOM changes so they can be reflected
				this.observer = new MutationObserver(function( mutations ) {
					// if there were changes...
					if(mutations.length > 0){
						// ...reparse the select
						m.ul.html(m._parseSelect()+'<li class="'+op.class_empty+'">'+op.empty+'</li>');
						m.items = m.wrapper.find('li');
						if(m.options.debug) console.log("Minimalect detected a DOM change for ", m.element);
					}
				});
				this.observer.observe(m.element[0], {childList: true});
			}

			// poll the original for changes
			if(op.live){
				// set cache to the original value
				var prevval = this.element.val();
				// set a tight interval to check for the original
				setInterval(function(){
					// if we're out of date
					if(prevval != m.element.val() && m.element.val() != null && m.element.val() != "") {
						// update cache
						prevval = m.element.val();
						// update selection
						if(typeof prevval == "array") {
							prevval.each(function(k,v){
								m._selectChoice(m.wrapper.find("li[data-value='"+v+"']"));
							});
						} else {
							m._selectChoice(m.wrapper.find("li[data-value='"+prevval+"']"));
						}
					} else if (m.element.val() == null || m.element.val() == "") {
						// update cache
						prevval = m.element.val();
						// if it was empty, let's clear it
						m.items.removeClass(m.options.class_selected);
						m.input.text('').attr('data-placeholder', m.options.placeholder);
					}

					// let's also check for disabled
					if(m.element.prop("disabled"))
						m.wrapper.addClass(op.class_disabled);
					else
						m.wrapper.removeClass(op.class_disabled);
				}, 100);
			}
 

			// after init callback
			op.afterinit();
		},


		// PRIVATE METHODS

		// navigate with a keyboard
		// dr - direction we're going, either "up" or "down"
		_navigateChoices: function(dr) {
			var m = this,
				wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options, // options object
				items = this.items;
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
						var offset = items.filter("."+op.class_highlighted).offset().top - this.ul.offset().top + this.ul.scrollTop();
						if (this.ul.scrollTop() > offset)
							this.ul.scrollTop(offset);
					} else { // if we are at the first
						items.not(ignored).last().addClass(op.class_highlighted); // highlight the last
						// make sure it's visible in a scrollable list
						this.ul.scrollTop(this.ul.height());
					}
				} else if (dr === 'down') {
					if(items.not(ignored).last()[0] != cur[0]) { // if we're not at the last
						cur.nextAll("li").not(ignored).first().addClass(op.class_highlighted); // highlight the next
						// make sure it's visible in a scrollable list
						var ddbottom = this.ul.height(),
							libottom = items.filter("."+op.class_highlighted).offset().top - this.ul.offset().top + items.filter("."+op.class_highlighted).outerHeight();
						if (ddbottom < libottom)
							this.ul.scrollTop(this.ul.scrollTop() + libottom - ddbottom);
					} else { // if we are at the last
						items.not(ignored).first().addClass(op.class_highlighted); // highlight the first
						// make sure it's visible in a scrollable list
						this.ul.scrollTop(0);
					}
				}
			}
		},

		// parse the entire select based on whether it has optgroups or not, and return the new markup
		_parseSelect: function() {
			var m = this, ulcontent = "";
			if( !this.element.find("optgroup").length ) { // if we don't have groups
				// just parse the elements regularly
				ulcontent = this._parseElements( this.element.html() );
			} else { // if we have groups
				// parse each group separately
				this.element.find("optgroup").each(function(){
					// create a group element
					ulcontent += '<li class="'+m.options.class_group+'">'+$(this).attr("label")+'</li>';
					// and add its children
					ulcontent += m._parseElements( $(this).html() );
				});
			}
			return ulcontent;
		},

		// turn option elements into li elements
		// elhtml - HTML containing the options
		_parseElements: function(elhtml) {
			var m = this, readyhtml = "";
			// go through each option
			$( $.trim(elhtml) ).filter("option").each(function(){
				var $el = $(this);
				if ($el.attr('value') === '' && m.options.remove_empty_option) return;
				// create an li with a data attribute containing its value
				readyhtml += '<li data-value="'+$el.val().replace(/"/g, "&quot;")+'" class="'+($el.attr("class") || "")+($el.prop("disabled") ? " "+m.options.class_disabled : "")+'">'+$el.text()+'</li>';
			});
			// spit it out
			return readyhtml;
		},

		// toggle the visibility of the dropdown
		_toggleChoices: function(){
			(!this.wrapper.hasClass(this.options.class_active)) ? this._showChoices() : this._hideChoices(this.wrapper);
		},

		// show the dropdown
		// cb - callback before the animation plays
		_showChoices: function(cb){
			var m = this,
				wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options; // options object
			if (!wr.hasClass(op.class_active)){
				// keep the first and last classes up to date
				this._updateFirstLast(false);
				// close all other open minimalects
				$("."+op.class_container).each(function(){ //todo this doesn't work if the container classes are different
					if($(this)[0] !== wr[0])
						m._hideChoices($(this));
				});
				// internal callback
				if(typeof cb === 'function') cb.call();
				// add the active class
				wr.addClass(op.class_active);
				switch(op.transition) {
					case "fade":
					this.ul.fadeIn(op.transition_time);
					break;
					default:
					this.ul.show();
					break;
				}
				// make the input editable
				this.input.text("").focus();
				// hide the reset link
				this._hideResetLink();
				// callback
				this.options.onopen();
			} else {
				// internal callback
				if(typeof cb === 'function') cb.call();
			}
		},

		_resetDropdown: function(cb){
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
		_hideChoices: function(wr, cb){
			var op = this.options, // options object
			    to = op.transition_time, // timeout for the transition to finish
			    m = this;

			if (wr.hasClass(op.class_active)){
				// remove the active class and fade out
				wr.removeClass(op.class_active);

				switch(op.transition) {
					case "fade":
					wr.children("ul").fadeOut(op.transition_time);
					break;
					default:
					wr.children("ul").hide();
					to = 0;
					break;
				}

				// set a timeout for clearing the field, so there's no flickering
				setTimeout(function(){
					// reset filters
					m._resetDropdown(cb);

					// blur the input
					m.input.blur();

					// reset it
					if(m.input.attr("data-placeholder") != op.placeholder) {
						// if we have a previously selected value, restore that
						m.input.text(m.input.attr("data-placeholder"));
					} else if(!m.items.filter("."+op.class_selected).length) {
						// if we have no selection, empty it to show placeholder
						m.input.text("");
					}
				}, to);

				// show the reset link
				m._showResetLink();

				// callback
				op.onclose();
			} else {
				// internal callback
				if(typeof cb === 'function') cb.call();
			}
		},

		// filter choices based on user input
		_filterChoices: function(){
			var wr = this.wrapper, // jQuery reference for the wrapper
				op = this.options, // options object
				m = this;

			if(op.ajax) {
				// if we're searching from ajax

				$.post(op.ajax, {"q": this.input.text()})
					.success(function(data){
						// we got a response

						if(op.debug) console.log("Minimalect received ", data, " for query '"+m.input.text()+"' in ", m.element);

						if(data.length) {
							// if we have results
							var new_html = "";
							$.each(data, function(k, choice){
								// parse each data point to an option in the original
								new_html += '<option value="'+choice.value+'">'+choice.name+'</option>';
							});
							// populate original element
							m.element.html(new_html);
							// parse and display it
							m.ul.html(m._parseSelect()+'<li class="'+op.class_empty+'">'+op.empty+'</li>');
							wr.find("."+op.class_empty).hide();

							// refresh internal cache
							m.items = wr.find('li');

							// callback, results found
							m.options.onfilter(true);
						} else {
							// show a "no results" placeholder if there's nothing to show
							m.ul.html('<li class="'+op.class_empty+'">'+op.empty+'</li>');
							wr.find("."+op.class_empty).show();
							// tell the console if debug mode is on
							if(op.debug) console.log("Minimalect didn't find any results for '"+m.input.text()+"' from ", m.element);
							// callback, no results found
							m.options.onfilter(false);
						}
					})
					.error(function(data){
						// show feedback for the user
						wr.find("."+op.class_empty).text(op.error_message);
						wr.find("li").not("."+op.class_empty).addClass(op.class_hidden);
						wr.find("."+op.class_empty).show();
						// tell the console if debug mode is on
						if(op.debug) console.error("Minimalect's AJAX query failed for ", m.element, " - came back with ", data);
					});
			} else {
				// traditional filtering

				// get the filter value, escape regex chars (thanks Andrew Clover!)
				var filter = this.input.text().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
				// reset keyboard navigation
				this.items.filter("."+op.class_highlighted).removeClass(op.class_highlighted);

				// filter through each option
				this.items.not(op.class_group).each(function(){
					// if there's no match (or if it's disabled), hide it. otherwise, unhide it
					if ($(this).text().search(new RegExp(filter, "i")) < 0 || $(this).hasClass(op.class_disabled))
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
					// tell the console if debug mode is on
					if(op.debug) console.log("Minimalect didn't find any results for '"+this.input.text()+"' from ", this.element);
					// callback, no results found
					this.options.onfilter(false);
				} else {
					// callback, results found
					this.options.onfilter(true);
				}

				// keep the first and last classes up to date
				this._updateFirstLast(true);
			}
		},

		// select the choice defined
		// ch - jQuery reference for the li element the user has chosen
		_selectChoice: function(ch){
			var el = this.element, // jQuery reference for the original select element
			    op = this.options, // options object
			    vals = [],
			    names = [];

			// if it's disabled, au revoir
			if(ch.hasClass(this.options.class_disabled)) return false;
			
			if(!op.live)
				this.items = this.wrapper.find('li');

			// apply the selected class
			if(!this.element.prop("multiple"))
				this.items.removeClass(op.class_selected);
			ch.addClass(op.class_selected);

			this.items.filter("."+op.class_selected).each(function(){
				vals.push($(this).data("value"));
				names.push($(this).text());
			});

			// show it up in the input
			this.input.text(names.join(", ")).attr("data-placeholder", names.join(", "));

			// if the selected choice is different
			if(el.val() != ch.data("value") || el.val() != vals){
				// update the original select element
				el.val(vals);
				// call original select change event
				el.trigger("change");
			}

			this._showResetLink();

			// callback
			this.options.onchange.call(this, ch.data("value"), ch.text());
		},

		// clear the select
		_resetChoice: function() {
			this.element.val('').trigger("change");
			this._hideResetLink();
		},

		// show the reset link if options.reset is true
		_showResetLink: function() {
			if(this.input.text().length > 0 || this.ul.find("li."+this.options.class_selected).length > 0)
				this.options.reset && this.reset.show();
		},

		// hide the reset link if options.reset is true
		_hideResetLink: function() {
			this.options.reset && this.reset.hide();
		},

		// keep the first and last classes up-to-date
		// vi - whether we want to count visibility or not
		_updateFirstLast: function(vi){
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
		},


		// PUBLIC METHODS

		// uninit Minimalect
		destroy: function(){
			// remove (and automatically unbind) all Minimalect stuff
			this.wrapper.remove();
			// display and unhook the original
			this.element.off("change focus blur").show();
			// stop listening for changes
			if (window.MutationObserver)
				this.observer.disconnect();

			// if debug mode is on, let them know upstairs
			if(this.options.debug) console.log("Minimalect destroyed for ", this.element);
		},

		// update Minimalect's choice from the original select
		update: function(){
			// reparse the select
			this.ul.html(this._parseSelect()+'<li class="'+this.options.class_empty+'">'+this.options.empty+'</li>');
		}

	};

	$.fn[pluginName] = function ( options, argument ) {
		return this.each(function () {
			if ($.isFunction(Plugin.prototype[options]) && options.charAt(0) != "_") {
				if(arguments.length == 1)
					$.data(this, 'plugin_' + pluginName)[options]();
				else
					$.data(this, 'plugin_' + pluginName)[options](argument);
			} else if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
		});
	};

})( jQuery, window, document );
