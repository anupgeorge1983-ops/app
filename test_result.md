#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Be Heard — couples conflict resolution mobile app. MVP demo mode (single device, sequential turns).
  Claude Sonnet 4.5 mediates a structured 3-round dialogue ending in a verdict for each partner.
  Simple name-based onboarding (no auth). New asks this iteration:
    1. Bigger Home title + motivational community stats; remove past cases list from Home.
    2. Dedicated Past Cases screen.
    3. Dedicated Stats screen.
    4. Voice-to-Text microphone button on every text-input screen (Whisper via Emergent key).

backend:
  - task: "POST /api/transcribe — Whisper transcription endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New endpoint accepts multipart file, validates size/ext, calls OpenAISpeechToText (whisper-1) via emergentintegrations. Needs E2E test with a real m4a/wav blob."
  - task: "GET /api/stats — per-user + community stats"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Returns total_cases, total_resolved, my_cases, my_resolved, my_in_progress."
  - task: "Existing cases/profile/mirror/verdict flow regression"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "Unchanged in this iteration; please regression-test create → submit → confirm-mirror → verdict end-to-end."

frontend:
  - task: "Home screen redesign (bigger title, motivational stat, no inline cases list)"
    implemented: true
    working: "NA"
    file: "frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Brand 'Be Heard' at 56pt, motivational stat under Start button, two link rows for Past cases + Your stats."
  - task: "Past Cases screen"
    implemented: true
    working: "NA"
    file: "frontend/app/cases.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Lists in-progress and resolved cases via /api/cases?user_id=. Tapping resolved → /verdict/{id}, in-progress → /case/{id}."
  - task: "Stats screen"
    implemented: true
    working: "NA"
    file: "frontend/app/stats.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Hero card with total_resolved + 4 personal tiles + 2 community tiles. Pull-to-refresh."
  - task: "MicButton — record + transcribe (E2E voice flow)"
    implemented: true
    working: "NA"
    file: "frontend/src/components/MicButton.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Uses expo-audio (RecordingPresets.HIGH_QUALITY). Honors permission contract incl. canAskAgain + Open Settings fallback. Web platform shows a friendly fallback message (recording not supported in web preview). Embedded in case/new.tsx and case/[id].tsx text input screens."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "POST /api/transcribe — Whisper transcription endpoint"
    - "GET /api/stats — per-user + community stats"
    - "Home screen redesign (bigger title, motivational stat, no inline cases list)"
    - "Past Cases screen"
    - "Stats screen"
    - "MicButton — record + transcribe (E2E voice flow)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Just finished implementing 4 frontend deliverables + 2 backend endpoints (stats + transcribe). Expo was restarted after expo-audio install. Please run a backend suite first (transcribe with a real audio fixture, stats correctness, regression of cases flow), then a frontend pass for the Home/Stats/Cases UI. MicButton: web preview is expected to show 'Voice recording isn't available on web' — that's intentional, not a bug; only assert UI affordance is present. Use the demo_user_id from /app/memory/test_credentials.md if present, else create a fresh onboarding user."
