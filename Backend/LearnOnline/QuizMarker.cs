using System.Text.Json;

namespace LearnOnline
{
    // Scores a multiple-choice quiz.
    // questionsJson: the assignment's [{ "question", "options", "correctAnswer": <index> }, ...]
    // answersJson:   the student's saved answers, { "<question index>": <chosen option index>, ... }
    public static class QuizMarker
    {
        public static decimal? Score(string questionsJson, string? answersJson, int? maxPoints)
        {
            try
            {
                var questions = JsonSerializer.Deserialize<JsonElement>(questionsJson);
                var answers = string.IsNullOrWhiteSpace(answersJson)
                    ? new Dictionary<string, JsonElement>()
                    : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(answersJson) ?? new();

                var total = questions.GetArrayLength();
                if (total == 0) return 0;

                var correct = 0;
                for (var i = 0; i < total; i++)
                {
                    if (!questions[i].TryGetProperty("correctAnswer", out var expected)) continue;
                    if (answers.TryGetValue(i.ToString(), out var given) && given.ToString() == expected.ToString()) correct++;
                }

                var max = maxPoints ?? total;
                return Math.Round((decimal)correct / total * max, 1);
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }
}
