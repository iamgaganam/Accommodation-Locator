package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	// Print to console as requested
	fmt.Println("Hello World from Go Backend!")

	// Setup a simple route
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello World from Go Backend!")
	})

	// Start server
	port := ":8080"
	fmt.Printf("Server starting on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
