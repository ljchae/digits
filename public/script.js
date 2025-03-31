document.addEventListener('DOMContentLoaded', function() {
    // Display current date
    const today = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', dateOptions);
    
    // Format date as YYYY-MM-DD for JSON lookup
    //const formattedDate = today.toISOString().split('T')[0];
    const formattedDate = '2026-01-01'; // For testing purposes, set a fixed date

    // Load questions from JSON file
    fetch('api/questions')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load questions.json');
            }
            return response.json();
        })
        .then(questions => {
            // Find today's question
            const todayQuestion = questions.find(q => q.date === formattedDate);
            
            if (todayQuestion) {
                // Update the question text
                document.getElementById('questionLabel').textContent = todayQuestion.question;
                
                // Store the answer and fact for later
                const correctAnswer = todayQuestion.answer;
                const factText = todayQuestion.fact;
                
                // Handle form submission
                document.getElementById('questionForm').addEventListener('submit', function(event) {
                    event.preventDefault();
                    
                    const userAnswer = parseInt(document.getElementById('answer').value);
                    
                    // test
                    // Submit the answer to the server
                    fetch('/api/answers', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ answer: parseInt(answer) }),
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Clear the form
                        document.getElementById('answer').value = '';
                        // Update the average
                        fetchAverage();
                        alert('Thank you for your response!');
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('There was an error submitting your response. Please try again.');
                    });

                    // Reveal the answer section
                    const answerReveal = document.getElementById('answerReveal');
                    answerReveal.style.display = 'block';
                    
                    // Update the answer section
                    document.getElementById('correctAnswer').textContent = correctAnswer;
                    document.getElementById('factText').textContent = factText;
                    
                    // You could add feedback here on whether they got it right
                    if (userAnswer === correctAnswer) {
                        alert("Correct! Great job!");
                    } else {
                        alert("Not quite right, but thanks for trying!");
                    }
                    
                    // Store in local storage that they've answered today's question
                    localStorage.setItem(`question_${formattedDate}`, JSON.stringify({
                        question: todayQuestion.question,
                        userAnswer: userAnswer,
                        correctAnswer: correctAnswer,
                        answeredOn: new Date().toISOString()
                    }));
                    
                    // Update previous questions display
                    loadPreviousQuestions();
                });
            } else {
                document.getElementById('questionLabel').textContent = "No question available for today. Check back tomorrow!";
                document.getElementById('answer').disabled = true;
                document.querySelector('button[type="submit"]').disabled = true;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('questionLabel').textContent = 
                "Error loading today's question. Please refresh or try again later.";
        });
    
    // Function to fetch the current average from the server
    function fetchAverage() {
        fetch('/api/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('average').textContent = data.average.toFixed(2);
            document.getElementById('count').textContent = data.count;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('average').textContent = 'Error loading data';
            document.getElementById('count').textContent = 'Error loading data';
        });
    }

    // Fetch the current average when the page loads
    fetchAverage();
});