# SPEC — cycle-tracker
"Lunar Pal" is a warm, empathetic period-tracker app that includes women with irregular cycles, featuring an adaptive companion that reflects the user's moods and energy levels.

## Idea
I've found that traditional period apps often rely on more rigid period-cycle assumptions, presenting clinical warnings or late-period stress indicators when cycles deviate. Instead, I want to reframe cycle tracking into an empathetic, supportive experience. First, the digital pet mirros expected energy levels across the four cycle phases (menstrual, follicular, ovulatory, lueteal), helping users visually gauge what to expect. Instead of alarming "period late" counters, the pet offers compassionate dialogue. Logging flow and symptoms should gain points in caring for the pet, transforming daily logging into a positive micro-interaction. The user should be able to customize attributes of the pet, like species, name, costume, etc.

## Screens
Home & Pet Component: the central dashboard where users interact with their digital pet and check daily predictions.
UI Components:
- Pet Avatar Display - visual representation of the pet reflecting current predicted cycle phase (e.g. wearing pajamas/drinking teas on rougher days)
- Dialogue and Insight Card - speech bubble displaying today's cycle day, predicted phase, and expected flow/energy advice
- Quick Care Buttons - toggles for basic self-care actions that grant care points.
- Care Point Counter: Displays earned points balance
Calendar & Cycle Logs: the interactive tracking screen where users view cycle history and log dates. UI Components:
- Interactive Calendar - highlights logged period days (red/pink indicators) and predicted future period windows (dashed indicators).
- Log Entry Panel - date selector, period toggle, flow intensity picker, symptom toggles.
- Historical Summary - displays calculated average cycle length and cycle variability.


## Data (what gets stored, and where)
All user data should be saved locally on the divice to guarantee privacy and survive app restarts. 