minimalect
----------

Minimal select replacement for jQuery by [@groenroos](http://twitter.com/groenroos). For usage examples, visit [groenroos.github.io/minimalect](http://groenroos.github.io/minimalect/)

* Replace select elements with a nicer styled control
* Support for optgroups
* Filtering choices by typing
* Keyboard navigation
* Support for themes

**New in 0.9.0 (28th May 2014)**

* AJAX search support
* Multiselect support
* Detects dynamic changes to original element automatically
* Disabled element support
* Public methods
* Optional reset functionality
* Combobox functionality now optional
* Less conflict with existing form styles
* Various bugfixes

### Usage

Include `jquery.minimalect.min.js` after you load jQuery (1.7 or newer). Then simply do;

    $("select").minimalect();

Remember to also include the stylesheet (SCSS and minified CSS available);

    <link rel="stylesheet" type="text/css" href="minimalect.min.css" media="screen" />

The default style is very understated, so it's easy to modify to better suit your needs. By default, no graphics are used; the arrow symbols are Unicode characters. Please be advised that not all typefaces on all devices support this, and depending on your target device, you may want to replace it with pre-rendered graphics.


#### AJAX functionality

You can also use Minimalect as a way to display search results from an AJAX call. For this, pass the `ajax` setting with the URL to the backend. Minimalect will send a POST request with the key `q` containing the value of the user's search. Minimalect will expect a JSON response with an array of objects, each having two keys: `name` and `value`.

Note, that the response received from the AJAX service will also modify choices available in the original `select` element, so that the selected choice may be appropriately sent with the rest of the form. The original contents of the `select` element are not restored if the user doesn't pick anything.


#### Programmatically changing the selected choice

If you wish to change the current value of the select, you can simply make your changes to the original element like you would normally with `.val()`. Minimalect will take it from there, providing that the `live` setting is set to `true`, like it is by default.


#### Programmatically changing the available choices

Since version 0.9.0, Minimalect will automatically recognize if the original options are changed dynamically, and the changes are reflected in the user-facing element. For this, Minimalect uses the MutationObserver, which has [spotty cross-browser support](http://caniuse.com/#feat=mutationobserver). For support in IE10 and earlier, Firefox 13 and earlier, Chrome 26 and earlier and Safari 5.1 and earlier, either use a [polyfill](https://github.com/Polymer/MutationObservers), or call the `update` method manually.


#### Available methods

You can call various Minimalect methods to control it programmatically. You can call methods by passing the method name as a string in a second call, e.g. `.minimalect("method")`

* `destroy` &mdash; remove all the features of Minimalect and restore the original select. *Warning:* this will unhook any `change`, `focus` or `blur` events you may have connected to the `select` via `.on()`
* `update` &mdash; refresh Minimalect's displayed choices from the original `select`. Minimalect will do this automatically in modern browsers. See above for details.


#### Available options

You can pass an object as a parameter for the `.minimalect()` call, to override the default settings.

You may edit all the CSS classnames that Minimalect uses so that they don't collide with ones you already use, as well as the user-facing messages for customization or internationalization.

##### Settings

* `theme` &mdash; the currently used theme. Applied as a class to the main div element. Default: *(empty)*
* `transition` &mdash; which effect should be used for showing and hiding the dropdown. Default: *fade*
* `transition_time` &mdash; how long the effect for showing and hiding the dropdown should take, in milliseconds. Default: *150*
* `remove_empty_option` &mdash; whether options with empty values should be removed. Default: `true`
* `show_reset` &mdash; whether to show a reset button to deselect a selected choice. Default: `false`
* `searchable` &mdash; whether the combobox functionality is enabled or not. Default: `true`
* `ajax` &mdash; URL of an AJAX resource for external search results. See above for details. Will not have an effect if `searchable` is `false`. Default: `null`
* `live` &mdash; whether Minimalect should automatically detect value changes to the original `select`. Creates an interval that runs indefinitely every 100 ms; may interfere with the DOM inspector. Default: `true`
* `debug` &mdash; whether Minimalect should explain in the console what it's doing. Useful for debugging. Default: `false`

##### Messages

* `placeholder` &mdash; the default text displayed whenever no choice has been selected. Set to `null` to inherit the placeholder from the value of the first option. Default: *Select a choice*
* `empty` &mdash; message displayed to the user when no choice matched his filter search term. Default: *No results matched your keyword.*
* `error` &mdash; message displayed to the user when an AJAX request fails for any reason. Default: *There was a problem with the request.*

##### Classes

* `class_container` &mdash; classname for the main div element. Default: *minict_wrapper*
* `class_group` &mdash; classname for a list item that represents an optgroup label. Default: *minict_group*
* `class_empty` &mdash; classname for the "No results" message when filtering produces no results. Default: *minict_empty*
* `class_active` &mdash; classname that is applied to the main div element whenever the dropdown is visible. Default: *active*
* `class_disabled` &mdash; classname that is applied to list items or the whole select, if they are disabled. Default: *disabled*
* `class_selected` &mdash; classname applied to the list item in the dropdown that is currently selected. Default: *selected*
* `class_hidden` &mdash; classname applied to list items in the dropdown that do not match the filter. Default: *hidden*
* `class_highlighted` &mdash; classname applied to the list item that is currently highlighted when the user uses keyboard navigation. Default: *highlighted*
* `class_first` &mdash; classname that corresponds to the first visible list item in the dropdown, including optgroup labels and the "No results" message. Helpful when rounding corners in CSS. Default: *minict_first*
* `class_last` &mdash; classname that corresponds to the last visible list item in the dropdown, including optgroup labels and the "No results" message. Helpful when rounding corners in CSS. Default: *minict_last*
* `class_reset` &mdash; classname applied to the optional reset element. Default: *minict_reset*

##### Callbacks

* `beforeinit` &mdash; Called immediately when the plugin is called, before any initialization work begins.
* `afterinit` &mdash; Called after Minimalect has been fully initialized.
* `onchange` &mdash; Called whenever the user selects an option in the list.
    * `value`; the value of the choice selected.
    * `text`; the user-facing text of the choice selected.
* `onopen` &mdash; Called when the dropdown list is displayed.
* `onclose` &mdash; Called when the dropdown list is closed (either by clicking away, or by selecting an option).
* `onfilter` &mdash; Called every time the list is filtered (basically every time the user types a letter into the filter box).
    * `match`; a boolean parameter, `true` if there was matches, `false` if no matches are found.


### Bugs & Support

Developed by [@groenroos](http://twitter.com/groenroos). Please list all bugs and feature requests in the [Github issue tracker](https://github.com/groenroos/minimalect/issues).

Licensed under the MIT license.
