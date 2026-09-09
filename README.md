# Events Factory

A production calendar for an events company. Managers issue orders to crew. Crew see those orders on a calendar and a board, then mark them done.

Open `index.html` in a browser, or from this folder run:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080). Phones and tablets use a compact calendar, bottom tabs, and a + Order button. Add the page to your home screen if you want it full-screen.

## Demo desks

Every demo password is `demo`.

| Person | Email | Role |
| --- | --- | --- |
| Maya Chen | maya@eventsfactory.studio | Manager |
| Alex Rivera | alex@eventsfactory.studio | Lighting lead |
| Jordan Blake | jordan@eventsfactory.studio | Catering captain |
| Sam Okonkwo | sam@eventsfactory.studio | Logistics |
| Riley Chen | riley@eventsfactory.studio | Floral & décor |

## What managers can do

- Create events (wedding, corporate, festival, and so on)
- Issue dated orders to a person
- See everyone’s calendar, filter by crew, search
- Move orders across to do / in progress / done / blocked
- Add people to the roster

## What crew can do

- Sign in and see only their own orders
- Open a day on the calendar
- Update status on an assigned order

Data stays in this browser (`localStorage`). Reset the demo by clearing site data for this origin.
