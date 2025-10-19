# Cricket Scoreboard API Documentation

A complete REST API for managing cricket matches, teams, players, and live scoring.

## 🚀 Base URL
```
http://localhost:3000/api
```

## 📋 Table of Contents
- [Authentication](#authentication)
- [Teams](#teams)
- [Players](#players)
- [Matches](#matches)

---

## 🔐 Authentication

### 1. Sign Up (Register)
Create a new user account.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@gmail.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "68f3d99fac9787306a28b83d",
    "name": "John Doe",
    "email": "john@gmail.com"
  }
}
```

---

### 2. Login
Authenticate user and create session.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@gmail.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "68f3d99fac9787306a28b83d",
    "name": "John Doe",
    "email": "john@gmail.com"
  }
}
```

---

### 3. Logout
End user session.

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4. Get Current User
Get logged-in user information.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "isLoggedIn": true,
  "user": {
    "id": "68f3d99fac9787306a28b83d",
    "name": "John Doe",
    "email": "john@gmail.com"
  }
}
```

---

### 5. Check Auth Status
Check if user is authenticated.

**Endpoint:** `GET /api/auth/check`

**Response:**
```json
{
  "isLoggedIn": true,
  "user": {
    "id": "68f3d99fac9787306a28b83d",
    "name": "John Doe",
    "email": "john@gmail.com"
  }
}
```

---

## 🏏 Teams

### 1. Get All Teams
Retrieve all teams with player counts.

**Endpoint:** `GET /api/teams`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "teams": [
    {
      "id": "68f3d9dfac9787306a28b841",
      "name": "Mumbai Indians",
      "captain": "Rohit Sharma",
      "description": "Five-time IPL Champions",
      "logo": "data:image/svg+xml...",
      "createdBy": "68f3d99fac9787306a28b83d",
      "createdAt": "2025-10-18T18:18:07.613Z",
      "createdDate": "Oct 18, 2025",
      "playerCount": 5
    }
  ]
}
```

---

### 2. Get Single Team
Get team details by ID.

**Endpoint:** `GET /api/teams/:id`

**Example:** `GET /api/teams/68f3d9dfac9787306a28b841`

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "68f3d9dfac9787306a28b841",
    "name": "Mumbai Indians",
    "captain": "Rohit Sharma",
    "description": "Five-time IPL Champions",
    "logo": "data:image/svg+xml...",
    "playerCount": 5
  }
}
```

---

### 3. Create Team
Create a new cricket team.

**Endpoint:** `POST /api/teams`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Mumbai Indians",
  "captain": "Rohit Sharma",
  "description": "Five-time IPL Champions",
  "logo": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23004BA0'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='20'%3EMI%3C/text%3E%3C/svg%3E"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Team \"Mumbai Indians\" created successfully!",
  "team": {
    "id": "68f3d9dfac9787306a28b841",
    "name": "Mumbai Indians",
    "captain": "Rohit Sharma",
    "description": "Five-time IPL Champions",
    "logo": "data:image/svg+xml...",
    "playerCount": 0
  }
}
```

---

### 4. Update Team
Update team information.

**Endpoint:** `PUT /api/teams/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Mumbai Indians",
  "captain": "Hardik Pandya",
  "description": "Updated description",
  "logo": "data:image/svg+xml..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Team \"Mumbai Indians\" updated successfully!",
  "team": {
    "id": "68f3d9dfac9787306a28b841",
    "name": "Mumbai Indians",
    "captain": "Hardik Pandya"
  }
}
```

---

### 5. Delete Team
Delete a team (also deletes all players).

**Endpoint:** `DELETE /api/teams/:id`

**Authentication:** Required

**Example:** `DELETE /api/teams/68f3d9dfac9787306a28b841`

**Response:**
```json
{
  "success": true,
  "message": "Team \"Mumbai Indians\" deleted successfully"
}
```

---

### 6. Export All Teams
Export all teams data as JSON.

**Endpoint:** `GET /api/teams/export/all`

**Response:**
```json
{
  "success": true,
  "teams": [
    {
      "id": "68f3d9dfac9787306a28b841",
      "name": "Mumbai Indians",
      "captain": "Rohit Sharma",
      "description": "Five-time IPL Champions",
      "logo": "data:image/svg+xml...",
      "createdAt": "2025-10-18T18:18:07.613Z"
    }
  ]
}
```

---

### 7. Clear All Teams
Delete all teams and players (DANGEROUS).

**Endpoint:** `DELETE /api/teams/clear/all`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "All teams deleted successfully",
  "deletedCount": 5
}
```

---

## 👥 Players

### 1. Get Players by Team
Get all players for a specific team.

**Endpoint:** `GET /api/players/team/:teamId`

**Example:** `GET /api/players/team/68f3d9dfac9787306a28b841`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "teamName": "Mumbai Indians",
  "players": [
    {
      "id": "68f46a1a0c5c4f8f740ac63c",
      "teamId": "68f3d9dfac9787306a28b841",
      "playerName": "Virat Kohli",
      "position": "Batsman",
      "contact": "9876543210",
      "email": "virat@gmail.com",
      "description": "Former captain",
      "photo": "data:image/svg+xml...",
      "createdDate": "Oct 19, 2025"
    }
  ]
}
```

---

### 2. Get Single Player
Get player details by ID.

**Endpoint:** `GET /api/players/:id`

**Example:** `GET /api/players/68f46a1a0c5c4f8f740ac63c`

**Response:**
```json
{
  "success": true,
  "player": {
    "id": "68f46a1a0c5c4f8f740ac63c",
    "teamId": "68f3d9dfac9787306a28b841",
    "teamName": "Mumbai Indians",
    "playerName": "Virat Kohli",
    "position": "Batsman",
    "contact": "9876543210",
    "email": "virat@gmail.com",
    "description": "Former captain",
    "photo": "data:image/svg+xml..."
  }
}
```

---

### 3. Create Player
Add a new player to a team.

**Endpoint:** `POST /api/players`

**Authentication:** Required

**Request Body:**
```json
{
  "teamId": "68f3d9dfac9787306a28b841",
  "playerName": "Virat Kohli",
  "position": "Batsman",
  "contact": "9876543210",
  "email": "virat@gmail.com",
  "description": "Former Indian cricket team captain",
  "photo": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='20' fill='%23FF6B6B'/%3E%3Ctext x='25' y='30' text-anchor='middle' fill='white' font-size='16'%3EVK%3C/text%3E%3C/svg%3E"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player \"Virat Kohli\" added successfully!",
  "player": {
    "id": "68f46a1a0c5c4f8f740ac63c",
    "teamId": "68f3d9dfac9787306a28b841",
    "teamName": "Mumbai Indians",
    "playerName": "Virat Kohli",
    "position": "Batsman",
    "contact": "9876543210",
    "email": "virat@gmail.com",
    "description": "Former Indian cricket team captain",
    "photo": "data:image/svg+xml...",
    "createdDate": "Oct 19, 2025"
  }
}
```

---

### 4. Update Player
Update player information.

**Endpoint:** `PUT /api/players/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "playerName": "Virat Kohli",
  "position": "All-rounder",
  "contact": "9876543210",
  "email": "virat@gmail.com",
  "description": "Updated description",
  "photo": "data:image/svg+xml..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player \"Virat Kohli\" updated successfully!",
  "player": {
    "id": "68f46a1a0c5c4f8f740ac63c",
    "playerName": "Virat Kohli",
    "position": "All-rounder"
  }
}
```

---

### 5. Delete Player
Remove a player from the team.

**Endpoint:** `DELETE /api/players/:id`

**Authentication:** Required

**Example:** `DELETE /api/players/68f46a1a0c5c4f8f740ac63c`

**Response:**
```json
{
  "success": true,
  "message": "Player \"Virat Kohli\" deleted successfully"
}
```

---

### 6. Export Players
Export all players for a team.

**Endpoint:** `GET /api/players/export/:teamId`

**Example:** `GET /api/players/export/68f3d9dfac9787306a28b841`

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": "68f46a1a0c5c4f8f740ac63c",
      "playerName": "Virat Kohli",
      "position": "Batsman",
      "contact": "9876543210",
      "email": "virat@gmail.com",
      "description": "Former captain",
      "photo": "data:image/svg+xml...",
      "createdAt": "2025-10-19T04:33:30.442Z"
    }
  ]
}
```

---

### 7. Clear Team Players
Delete all players from a team.

**Endpoint:** `DELETE /api/players/clear/:teamId`

**Authentication:** Required

**Example:** `DELETE /api/players/clear/68f3d9dfac9787306a28b841`

**Response:**
```json
{
  "success": true,
  "message": "All players cleared successfully",
  "deletedCount": 5
}
```

---

## 🏆 Matches

### 1. Get All Matches
Retrieve all matches.

**Endpoint:** `GET /api/matches`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "matches": [
    {
      "id": "68f46c7c28058e9fcbca4cd0",
      "team1": {
        "id": "68f3d9dfac9787306a28b841",
        "name": "Mumbai Indians",
        "logo": "data:image/svg+xml..."
      },
      "team2": {
        "id": "68f46b8b28058e9fcbca4cc5",
        "name": "Chennai Super Kings",
        "logo": "data:image/svg+xml..."
      },
      "status": "completed",
      "resultText": "Mumbai Indians wins by 5 runs",
      "winner": {
        "id": "68f3d9dfac9787306a28b841",
        "name": "Mumbai Indians",
        "logo": "data:image/svg+xml..."
      },
      "createdAt": "2025-10-19T04:41:48.123Z",
      "completedAt": "2025-10-19T05:15:22.456Z"
    }
  ]
}
```

---

### 2. Get Single Match
Get detailed match information.

**Endpoint:** `GET /api/matches/:id`

**Example:** `GET /api/matches/68f46c7c28058e9fcbca4cd0`

**Response:**
```json
{
  "success": true,
  "match": {
    "id": "68f46c7c28058e9fcbca4cd0",
    "team1": {
      "name": "Mumbai Indians"
    },
    "team2": {
      "name": "Chennai Super Kings"
    },
    "tossWinner": {
      "name": "Mumbai Indians"
    },
    "coinResult": "heads",
    "tossChoice": "batting",
    "battingFirst": {
      "name": "Mumbai Indians"
    },
    "fieldingFirst": {
      "name": "Chennai Super Kings"
    },
    "status": "live",
    "scores": [
      {
        "innings": 1,
        "battingTeamId": "68f3d9dfac9787306a28b841",
        "runs": 145,
        "wickets": 5,
        "balls": 120,
        "fours": 12,
        "sixes": 4,
        "completedPlayers": [],
        "currentPlayer": {
          "player": {
            "id": "68f46a1a0c5c4f8f740ac63c",
            "playerName": "Virat Kohli"
          },
          "stats": {
            "runs": 45,
            "balls": 32,
            "fours": 4,
            "sixes": 2
          }
        }
      }
    ]
  }
}
```

---

### 3. Create Match (Setup + Toss)
Create a new match with toss results.

**Endpoint:** `POST /api/matches`

**Authentication:** Required

**Request Body:**
```json
{
  "team1Id": "68f3d9dfac9787306a28b841",
  "team2Id": "68f46b8b28058e9fcbca4cc5",
  "tossWinnerId": "68f3d9dfac9787306a28b841",
  "coinResult": "heads",
  "tossChoice": "batting",
  "battingFirstId": "68f3d9dfac9787306a28b841",
  "fieldingFirstId": "68f46b8b28058e9fcbca4cc5"
}
```

**Fields:**
- `coinResult`: "heads" or "tails"
- `tossChoice`: "batting" or "fielding"
- `battingFirstId`: Team ID that will bat first
- `fieldingFirstId`: Team ID that will field first

**Response:**
```json
{
  "success": true,
  "message": "Match setup saved successfully",
  "matchId": "68f46c7c28058e9fcbca4cd0",
  "match": {
    "id": "68f46c7c28058e9fcbca4cd0",
    "team1": {
      "name": "Mumbai Indians"
    },
    "team2": {
      "name": "Chennai Super Kings"
    },
    "battingFirst": {
      "name": "Mumbai Indians"
    },
    "status": "setup"
  }
}
```

---

### 4. Select Player
Select a player to bat in current innings.

**Endpoint:** `POST /api/matches/:id/select-player`

**Authentication:** Required

**Request Body:**
```json
{
  "playerId": "68f46a1a0c5c4f8f740ac63c",
  "innings": 1
}
```

**Fields:**
- `innings`: 1 or 2

**Response:**
```json
{
  "success": true,
  "player": {
    "id": "68f46a1a0c5c4f8f740ac63c",
    "playerName": "Virat Kohli",
    "position": "Batsman",
    "photo": "data:image/svg+xml...",
    "teamId": "68f3d9dfac9787306a28b841"
  }
}
```

---

### 5. Score Runs
Record runs scored by current player.

**Endpoint:** `POST /api/matches/:id/score-runs`

**Authentication:** Required

**Request Body:**
```json
{
  "runs": 4,
  "innings": 1
}
```

**Fields:**
- `runs`: 0, 1, 2, 3, 4, or 6
- `innings`: 1 or 2

**Response:**
```json
{
  "success": true,
  "teamStats": {
    "runs": 50,
    "wickets": 2,
    "balls": 48,
    "fours": 5,
    "sixes": 2
  },
  "playerStats": {
    "runs": 25,
    "balls": 18,
    "fours": 3,
    "sixes": 1
  }
}
```

---

### 6. Score Extra (Wide/No Ball/Bye)
Record extra runs (no ball counted for byes).

**Endpoint:** `POST /api/matches/:id/score-extra`

**Authentication:** Required

**Request Body:**
```json
{
  "extraType": "wide",
  "runs": 1,
  "innings": 1
}
```

**Fields:**
- `extraType`: "wide", "noball", "bye", or "legbye"
- `runs`: Number of runs (typically 1, but can be more for byes)
- `innings`: 1 or 2

**Response:**
```json
{
  "success": true,
  "teamStats": {
    "runs": 51,
    "wickets": 2,
    "balls": 48,
    "fours": 5,
    "sixes": 2
  }
}
```

---

### 7. Player Out
Mark current player as out.

**Endpoint:** `POST /api/matches/:id/player-out`

**Authentication:** Required

**Request Body:**
```json
{
  "innings": 1
}
```

**Response:**
```json
{
  "success": true,
  "teamStats": {
    "runs": 51,
    "wickets": 3,
    "balls": 49,
    "fours": 5,
    "sixes": 2
  },
  "shouldEndInnings": false,
  "endReason": null,
  "remainingPlayers": 7
}
```

**Auto-end conditions:**
- 10 wickets fallen
- No more players available
- Target achieved (2nd innings only)

---

### 8. End Innings
End current innings or complete match.

**Endpoint:** `POST /api/matches/:id/end-innings`

**Authentication:** Required

**Request Body:**
```json
{
  "innings": 1
}
```

**Response (1st Innings):**
```json
{
  "success": true,
  "message": "1st Innings Complete! Starting 2nd Innings...",
  "newInnings": 2
}
```

**Response (2nd Innings - Match Complete):**
```json
{
  "success": true,
  "message": "Match Complete!",
  "matchComplete": true,
  "result": {
    "winner": {
      "id": "68f3d9dfac9787306a28b841",
      "name": "Mumbai Indians",
      "logo": "data:image/svg+xml..."
    },
    "text": "Mumbai Indians wins by 5 runs"
  }
}
```

**Result for Tie:**
```json
{
  "result": {
    "winner": null,
    "text": "Match Tied!"
  }
}
```

---

## 📊 Position Enums

Valid player positions:
- `Batsman`
- `Bowler`
- `All-rounder`
- `Wicket-keeper`
- `Captain`
- `Vice-Captain`

---

## 🔒 Authentication Notes

- Sessions are used for authentication (cookie-based)
- Login persists across requests in same session
- Protected routes require active session
- Session expires after 24 hours

---

## 🎯 Match Status Values

- `setup` - Match created, not started
- `live` - 2nd innings in progress
- `completed` - Match finished

---

## 📝 Validation Rules

### Email
- Must be Gmail address (`@gmail.com`)

### Password
- Minimum 8 characters
- Must contain letters and numbers

### Team Name
- Maximum 50 characters
- Must be unique

### Player Name
- Maximum 50 characters
- Must be unique within team

---

## 🚨 Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required. Please login."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Team not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "All fields are required"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Error creating team"
}
```

---

## 🧪 Testing Workflow

### Complete Match Flow:

1. **Login:** `POST /api/auth/login`
2. **Create Teams:** `POST /api/teams` (x2)
3. **Add Players:** `POST /api/players` (multiple)
4. **Create Match:** `POST /api/matches`
5. **Select Player:** `POST /api/matches/:id/select-player`
6. **Score Runs:** `POST /api/matches/:id/score-runs` (multiple)
7. **Player Out:** `POST /api/matches/:id/player-out`
8. **End 1st Innings:** `POST /api/matches/:id/end-innings`
9. **Repeat 5-7 for 2nd innings**
10. **End 2nd Innings:** `POST /api/matches/:id/end-innings`
11. **View Result:** `GET /api/matches/:id`

---

## 📦 Installation & Setup

```bash
# Install dependencies
npm install

# Setup .env file
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
SESSION_SECRET=your_secret_key
NODE_ENV=development

# Run server
npm run dev
```

---

## 🌐 Technologies Used

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Express Session
- Bcryptjs

---

## 👨‍💻 Author

Your Name - Cricket Scoreboard API

---

## 📄 License

This project is licensed under the MIT License.
