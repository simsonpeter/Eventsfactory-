# Events Factory

A production calendar for an events company. Managers issue orders to crew. Crew see those orders on a calendar and a board, then mark them done.

Login and the crew roster live in a **SQLite** database on the server (`data/eventsfactory.sqlite`). Passwords are hashed. Events and orders are stored in the same database so assignments stay attached to real people.

```bash
npm install
npm start
```

Then visit [http://localhost:8080](http://localhost:8080).

## Demo desks

Every demo password is `demo`.

| Person | Email | Role |
| --- | --- | --- |
| Maya Chen | maya@eventsfactory.studio | Manager |
| Alex Rivera | alex@eventsfactory.studio | Lighting lead |
| Jordan Blake | jordan@eventsfactory.studio | Catering captain |
| Sam Okonkwo | sam@eventsfactory.studio | Logistics |
| Riley Chen | riley@eventsfactory.studio | Floral & décor |

Add crew from **Team**. They sign in with the email you set and password `demo`.

## What managers can do

- Create events (wedding, corporate, festival, and so on)
- Issue dated orders to a person
- See everyone’s calendar, filter by crew, search
- Move orders across to do / in progress / done / blocked
- Add people to the roster (saved in SQLite)

## What crew can do

- Sign in and see only their own orders
- Open a day on the calendar
- Update status on an assigned order

The SQLite file is created on first start and is gitignored. Delete `data/eventsfactory.sqlite` to reset the demo roster.
