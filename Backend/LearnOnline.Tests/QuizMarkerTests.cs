using FluentAssertions;

namespace LearnOnline.Tests;

public class QuizMarkerTests
{
    private const string Questions = """
        [{"question":"a","options":["x","y"],"correctAnswer":1},
         {"question":"b","options":["x","y"],"correctAnswer":0},
         {"question":"c","options":["x","y"],"correctAnswer":1},
         {"question":"d","options":["x","y"],"correctAnswer":1}]
        """;

    [Fact]
    public void Score_CountsCorrectAnswersScaledToMaxPoints()
    {
        QuizMarker.Score(Questions, """{"0":1,"1":0,"2":0}""", maxPoints: 20).Should().Be(10m);
    }

    [Fact]
    public void Score_NoMaxPoints_UsesQuestionCount()
    {
        QuizMarker.Score(Questions, """{"0":1,"1":0,"2":1,"3":1}""", maxPoints: null).Should().Be(4m);
    }

    [Fact]
    public void Score_UnreadableAnswers_ReturnsNull()
    {
        QuizMarker.Score(Questions, "https://not-a-quiz.pdf", maxPoints: 10).Should().BeNull();
    }
}
