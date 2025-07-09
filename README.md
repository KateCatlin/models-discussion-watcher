# 🐛 models-discussion-watcher

This GitHub Action monitors the public [GitHub Models Community Discussions](https://github.com/orgs/community/discussions/categories/models) and uses **GitHub Models AI** to detect posts that may contain bug reports. If a potential bug is found, the Action automatically opens a GitHub Issue for the team to triage.

---

## 🔍 What it does

* Scrapes the **Models** category in GitHub Discussions
* Uses `openai/gpt-4o` via [GitHub Models](https://docs.github.com/en/rest/models?apiVersion=2022-11-28) to classify each post as:

  * `BUG_REPORT`
  * `FEATURE_REQUEST`
  * `QUESTION`
  * `DISCUSSION`
* Adds a confidence score and brief reasoning for each classification
* Automatically creates GitHub Issues for high-confidence bug reports

---

## 🧠 Why this matters

If a bug report comes in via the community forum, I want to know right away. This Action helps surface those issues automatically—without waiting for someone to manually triage. 

It’s also a sample workflow that shows how GitHub Models can streamline your team's processes with a bit of automation and AI! ✨

---

## 🛠 How it works

* **Runs daily at 4PM UTC**
* Only processes new discussions posted in the past 24 hours (no duplicates)
* Falls back to a keyword-based classifier if the API call fails
* Issues are labeled `auto-detected`, `bug-report`, and `needs-triage`

---

## 🚀 Usage

1. Fork or clone the repo
2. Customize the discussion category, model used, or classification logic as needed
3. Enable or modify the schedule in `.github/workflows/main.yml`
4. That’s it!

---

## 🧪 Example Output

```
📊 SUMMARY (Last 24 Hours)
🐛 Bug Reports: 2
✨ Feature Requests: 1
❓ Questions: 3
💬 General Discussions: 4

🐛 BUG REPORTS DETECTED
• Embedding API only returns one result when I send multiple inputs? (92% confidence)
  💭 This suggests the user expected batch support but got a single result.
  🔗 https://github.com/orgs/community/discussions/...

✅ GitHub Issue #42 created for triage.
```

---

## 🙋‍♀️ Why I built this

Sometimes the best bug reports come from the community just talking about what's going on. This was a fun experiment to combine GitHub Actions + GitHub Models to automatically catch them upstream.

I also want people to feel empowered to sprinkle AI into their own workflows—effortlessly. This project shows how you can do that with almost no extra setup, just by using Actions and the Models API.

PRs welcome, ideas encouraged!
