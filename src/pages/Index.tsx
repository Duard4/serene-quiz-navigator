import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Upload,
  Settings,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface TestData {
  title: string;
  description: string;
  questions: Question[];
}

interface TestConfig {
  numberOfQuestions: number;
  startFrom: number;
  randomize: boolean;
}

interface UserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
}

const TestApplication = () => {
  const [currentScreen, setCurrentScreen] = useState<
    "welcome" | "setup" | "test" | "results"
  >("welcome");
  const [testData, setTestData] = useState<TestData | null>(null);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    numberOfQuestions: 10,
    startFrom: 1,
    randomize: false,
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentScreen === "test" && startTime && !endTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, startTime, endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
          throw new Error("Invalid test format");
        }
        setTestData(jsonData);
        toast({
          title: "Test loaded successfully!",
          description: `${jsonData.title} with ${jsonData.questions.length} questions`,
        });
      } catch (error) {
        toast({
          title: "Error loading test",
          description: "Please check your JSON file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const startTest = () => {
    if (!testData) return;

    let questions = [...testData.questions];

    // Apply start from filter
    if (testConfig.startFrom > 1) {
      questions = questions.slice(testConfig.startFrom - 1);
    }

    // Apply randomization
    if (testConfig.randomize) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Limit number of questions
    questions = questions.slice(0, testConfig.numberOfQuestions);

    setTestQuestions(questions);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setStartTime(new Date());
    setEndTime(null);
    setElapsedTime(0);
    setCurrentScreen("test");
    setShowSetupDialog(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const confirmAnswer = () => {
    if (selectedOption === null) return;

    const currentQuestion = testQuestions[currentQuestionIndex];
    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOption,
      isCorrect: selectedOption === currentQuestion.correct,
    };

    const newAnswers = [...userAnswers];
    const existingIndex = newAnswers.findIndex(
      (a) => a.questionId === currentQuestion.id
    );

    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }

    setUserAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    setEndTime(new Date());
    setCurrentScreen("results");
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    const existingAnswer = userAnswers.find(
      (a) => a.questionId === testQuestions[index].id
    );
    setSelectedOption(existingAnswer ? existingAnswer.selectedOption : null);
  };

  const calculateResults = () => {
    const correctAnswers = userAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = testQuestions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    let grade = "F";
    if (percentage >= 90) grade = "A";
    else if (percentage >= 80) grade = "B";
    else if (percentage >= 70) grade = "C";
    else if (percentage >= 60) grade = "D";

    return { correctAnswers, totalQuestions, percentage, grade };
  };

  const resetTest = () => {
    setCurrentScreen("welcome");
    setTestData(null);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setTestQuestions([]);
    setStartTime(null);
    setEndTime(null);
    setElapsedTime(0);
    setReviewMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Welcome Screen
  if (currentScreen === "welcome") {
    return (
      <div className="min-h-screen bg-warm-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-600 rounded-full mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-amber-800 mb-4">
              Test Application
            </h1>
            <p className="text-lg text-warm-700 max-w-md mx-auto">
              Take tests and quizzes with our modern, user-friendly interface.
              Track your progress and get detailed feedback on your performance.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setShowSetupDialog(true)}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all animate-scale-in"
            >
              <Settings className="w-5 h-5 mr-2" />
              Start Test
            </Button>

            <p className="text-sm text-warm-600">
              Upload a JSON test file to begin
            </p>
          </div>
        </div>

        {/* Setup Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-md max-h-[80vh] bg-warm-50">
            <DialogHeader>
              <DialogTitle className="text-amber-800">Test Setup</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* File Upload Section */}
                <div className="space-y-3">
                  <Label className="text-amber-800 font-medium">
                    Test File
                  </Label>
                  <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-300 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-amber-600">
                        Click to upload JSON file
                      </p>
                    </label>
                  </div>

                  {testData && (
                    <div className="p-3 bg-success-100 rounded-lg border border-success-500">
                      <p className="font-medium text-success-600">
                        {testData.title}
                      </p>
                      <p className="text-sm text-success-600">
                        {testData.questions.length} questions available
                      </p>
                    </div>
                  )}
                </div>

                {testData && (
                  <>
                    <Separator />

                    {/* Configuration Options */}
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="numQuestions"
                          className="text-amber-800 font-medium"
                        >
                          Number of Questions
                        </Label>
                        <Input
                          id="numQuestions"
                          type="number"
                          min={1}
                          max={testData.questions.length}
                          value={testConfig.numberOfQuestions}
                          onChange={(e) =>
                            setTestConfig({
                              ...testConfig,
                              numberOfQuestions: Math.min(
                                parseInt(e.target.value) || 1,
                                testData.questions.length
                              ),
                            })
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="startFrom"
                          className="text-amber-800 font-medium"
                        >
                          Start from Question
                        </Label>
                        <Input
                          id="startFrom"
                          type="number"
                          min={1}
                          max={testData.questions.length}
                          value={testConfig.startFrom}
                          onChange={(e) =>
                            setTestConfig({
                              ...testConfig,
                              startFrom: Math.min(
                                parseInt(e.target.value) || 1,
                                testData.questions.length
                              ),
                            })
                          }
                          className="mt-1"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="randomize"
                          checked={testConfig.randomize}
                          onChange={(e) =>
                            setTestConfig({
                              ...testConfig,
                              randomize: e.target.checked,
                            })
                          }
                          className="rounded border-amber-300 text-amber-400 focus:ring-amber-400"
                        />
                        <Label htmlFor="randomize" className="text-amber-800">
                          Randomize Questions
                        </Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t border-warm-200">
              <Button
                variant="outline"
                onClick={() => setShowSetupDialog(false)}
                className="flex-1 border-amber-700 bg-amber-600 hover:bg-amber-50 "
              >
                Cancel
              </Button>
              <Button
                onClick={startTest}
                disabled={!testData}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Begin Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Test Screen
  if (currentScreen === "test") {
    const currentQuestion = testQuestions[currentQuestionIndex];
    const hasAnswered = userAnswers.some(
      (a) => a.questionId === currentQuestion.id
    );

    return (
      <div className="min-h-screen bg-warm-100 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-warm-50 rounded-lg p-4 mb-6 shadow-sm">
            <div className="grid gap-3 sm:flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-amber-800">
                {testData?.title}
              </h1>
              <div className="flex items-center gap-4 text-amber-700">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-600 text-amber-700"
                >
                  {currentQuestionIndex + 1} of {testQuestions.length}
                </Badge>
              </div>
            </div>

            {/* Progress Bar - Fixed to show answered questions percentage */}
            <div className="w-full bg-warm-200 rounded-full h-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (userAnswers.length / testQuestions.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Content */}
            <div className="lg:col-span-3">
              <Card className="test-card">
                <CardHeader>
                  <CardTitle className="text-amber-800">
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-lg leading-relaxed text-warm-800">
                    {currentQuestion.question}
                  </p>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`answer-option ${
                          selectedOption === index
                            ? "answer-selected"
                            : "answer-unselected"
                        }`}
                        onClick={() => handleAnswerSelect(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selectedOption === index
                                ? "border-amber-600 bg-amber-600"
                                : "border-warm-400"
                            }`}
                          >
                            {selectedOption === index && (
                              <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        goToQuestion(Math.max(0, currentQuestionIndex - 1))
                      }
                      disabled={currentQuestionIndex === 0}
                      className="border-amber-600 text-amber-800 bg-amber-50 sm:text-white sm:bg-amber-600 sm:hover:bg-amber-50 sm:hover:text-amber-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>

                    <Button
                      onClick={confirmAnswer}
                      disabled={selectedOption === null}
                      className="bg-amber-600 hover:bg-amber-700 flex-1"
                    >
                      {hasAnswered ? "Update Answer" : "Confirm Answer"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        goToQuestion(
                          Math.min(
                            testQuestions.length - 1,
                            currentQuestionIndex + 1
                          )
                        )
                      }
                      disabled={
                        currentQuestionIndex === testQuestions.length - 1
                      }
                      className="border-amber-600 text-amber-800 bg-amber-50 sm:text-white sm:bg-amber-600 sm:hover:bg-amber-50 sm:hover:text-amber-800"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Panel */}
            <div className="lg:col-span-1">
              <Card className="test-card">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-sm">
                    Question Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-52">
                    <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-2">
                      {testQuestions.map((_, index) => {
                        const isAnswered = userAnswers.some(
                          (a) => a.questionId === testQuestions[index].id
                        );
                        const isCurrent = index === currentQuestionIndex;

                        return (
                          <Button
                            key={index}
                            variant={isCurrent ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToQuestion(index)}
                            className={`relative ${
                              isCurrent
                                ? "bg-amber-600 hover:bg-amber-700"
                                : isAnswered
                                ? "border-red-700 text-success-50 bg-red-700 hover:bg-amber-100 hover:text-amber-700"
                                : "border-amber-600 text-amber-700 bg-amber-50 hover:bg-red-700 hover:text-amber-50"
                            }`}
                          >
                            {index + 1}
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="mt-4 pt-4 border-t border-warm-200">
                    <div className="text-sm text-warm-600 space-y-1">
                      <p>
                        Answered: {userAnswers.length} / {testQuestions.length}
                      </p>
                      <Button
                        onClick={finishTest}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-amber-600 text-amber-700 bg-amber-50 hover:bg-red-700 hover:text-amber-50"
                      >
                        Finish Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "results") {
    const results = calculateResults();
    const testDuration =
      endTime && startTime
        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        : 0;

    if (reviewMode) {
      const currentQuestion = testQuestions[currentQuestionIndex];
      const userAnswer = userAnswers.find(
        (a) => a.questionId === currentQuestion.id
      );

      return (
        <div className="min-h-screen bg-warm-100 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-warm-50 rounded-lg p-4 mb-6 shadow-sm">
              <div className="grid gap-3 sm:flex items-center justify-between">
                <h1 className="text-xl font-bold text-amber-800">
                  Review Mode
                </h1>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setReviewMode(false)}
                    className="border-amber-600 text-amber-800 bg-white hover:bg-amber-600 hover:text-white"
                  >
                    Back to Results
                  </Button>
                  <Badge
                    variant="outline"
                    className="border-amber-600 text-amber-700"
                  >
                    {currentQuestionIndex + 1} of {testQuestions.length}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <Card className="test-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    Question {currentQuestionIndex + 1}
                    {userAnswer?.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-error-500" />
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="text-lg leading-relaxed text-warm-800">
                    {currentQuestion.question}
                  </p>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      let className = "answer-option ";

                      if (index === currentQuestion.correct) {
                        className += "answer-correct";
                      } else if (
                        userAnswer &&
                        index === userAnswer.selectedOption &&
                        !userAnswer.isCorrect
                      ) {
                        className += "answer-incorrect";
                      } else {
                        className += "border-warm-300 bg-warm-50";
                      }

                      return (
                        <div key={index} className={className}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {index === currentQuestion.correct && (
                                <CheckCircle className="w-4 h-4 text-success-500" />
                              )}
                              {userAnswer &&
                                index === userAnswer.selectedOption &&
                                !userAnswer.isCorrect && (
                                  <XCircle className="w-4 h-4 text-error-500" />
                                )}
                            </div>
                            <span className="flex-1">{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {currentQuestion.explanation && (
                    <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
                      <h4 className="font-medium text-sage-700 mb-2">
                        Explanation
                      </h4>
                      <p className="text-sage-600">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  <div className="grid sm:flex gap-1 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        goToQuestion(Math.max(0, currentQuestionIndex - 1))
                      }
                      disabled={currentQuestionIndex === 0}
                      className="border-amber-600 text-amber-800 bg-amber-50 sm:text-white sm:bg-amber-600 sm:hover:bg-amber-50 sm:hover:text-amber-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        goToQuestion(
                          Math.min(
                            testQuestions.length - 1,
                            currentQuestionIndex + 1
                          )
                        )
                      }
                      disabled={
                        currentQuestionIndex === testQuestions.length - 1
                      }
                      className="border-amber-600 text-amber-800 bg-amber-50 sm:text-white sm:bg-amber-600 sm:hover:bg-amber-50 sm:hover:text-amber-800"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-1">
                <Card className="test-card h-auto">
                  <CardHeader>
                    <CardTitle className="text-amber-800 text-sm">
                      Question Navigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-auto">
                      <div className="grid grid-cols-5 gap-2">
                        {testQuestions.map((q, index) => {
                          const userAnswer = userAnswers.find(
                            (a) => a.questionId === q.id
                          );
                          const isCurrent = index === currentQuestionIndex;

                          return (
                            <Button
                              key={index}
                              variant={isCurrent ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToQuestion(index)}
                              className={`relative  text-white ${
                                isCurrent
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : userAnswer?.isCorrect
                                  ? "border-success-600 bg-success-500 hover:bg-success-100 hover:text-success-700"
                                  : "border-error-600 bg-error-500 hover:bg-error-50"
                              }`}
                            >
                              {index + 1}
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Result Summary Screen (Not in review mode)
    return (
      <div className="min-h-screen bg-warm-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                results.percentage >= 70 ? "bg-success-500" : "bg-error-500"
              }`}
            >
              {results.percentage >= 70 ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <XCircle className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-amber-800 mb-2">
              Test Complete!
            </h1>
            <p className="text-warm-600">Here are your results</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="test-card text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  {results.correctAnswers}/{results.totalQuestions}
                </div>
                <p className="text-sm text-warm-600">Correct Answers</p>
              </CardContent>
            </Card>

            <Card className="test-card text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  {results.percentage}%
                </div>
                <p className="text-sm text-warm-600">Score</p>
              </CardContent>
            </Card>

            <Card className="test-card text-center">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  {formatTime(testDuration)}
                </div>
                <p className="text-sm text-warm-600">Time Taken</p>
              </CardContent>
            </Card>

            <Card className="test-card text-center">
              <CardContent className="pt-6">
                <div
                  className={`text-2xl font-bold mb-1 ${
                    results.percentage >= 70
                      ? "text-success-500"
                      : "text-error-500"
                  }`}
                >
                  {results.grade}
                </div>
                <p className="text-sm text-warm-600">Grade</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => setReviewMode(true)}
              variant="outline"
              className="border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-amber-50"
            >
              Review Answers
            </Button>
            <Button
              onClick={resetTest}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestApplication;
