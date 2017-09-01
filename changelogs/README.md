# Changelogs

These are shown to users upon visiting the site if they haven't opted out and if there has been a new changelog published since.

As notable changes occur to the codebase, we'll add changelogs to this folder on the repository. If you're running your own site, you can provide your own changelogs by using the folder for yourself, but that requires some Git customization to set up and keep pulling changes, so we recommend against it. You can set `enableChangelogs` to *false* in the configuration file to disable this functionality altogether.

## Changelog file reference

Changelog files should be a `.json` file in the `changelogs` (this) folder. They should be numbered with newer ones first, as that's how the software will sort them and choose to display them. Changelogs with a higher version than the last one the user has seen will be shown as missed changelogs.

### Changelog file keys

- `text`: Markdown text to display as a list of changes. This will be converted to HTML automatically.
- `date`: A date to show the user the change occurred on. Format it as `YYYY-MM-DD` and use GMT time.

### Example

```json
{
    "date": "2016-04-20",
    "text": "* Test\n*Test"
}```